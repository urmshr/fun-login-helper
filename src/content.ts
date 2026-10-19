import { URLS, SELECTORS, TEXTS, CONFIG, MESSAGES } from './constants';
import type { StorageItems } from './types';
import { log, waitForElement, getStoredCredential, runBeforeLinkNavigation } from './utils';

/**
 * SSOのログイン画面にエラーが表示されているかを判定する
 */
const detectLoginFailure = (): boolean => {
  const errorElement = document.querySelector(SELECTORS.LOGIN_ERROR);
  return !!(errorElement && errorElement.textContent?.trim() !== '');
};

/**
 * フォームの送信前にログインの試行を記録する。上限に達していたら記録せず、ログイン補助を一時停止する
 * @returns フォームを送信してよければ true
 */
const recordLoginAttempt = async (): Promise<boolean> => {
  const now = Date.now();
  const { loginAttempts = [] } = await chrome.storage.local.get<StorageItems>('loginAttempts');
  const recentAttempts = loginAttempts.filter(time => now - time < CONFIG.LOGIN_ATTEMPT_WINDOW);

  if (recentAttempts.length >= CONFIG.MAX_LOGIN_ATTEMPTS) {
    await chrome.storage.local.set<StorageItems>({ blocked: true });
    return false;
  }

  await chrome.storage.local.set<StorageItems>({ loginAttempts: [...recentAttempts, now] });
  return true;
};

/**
 * HOPEにログイン済みかどうかを判定する
 * （ユーザーメニューに「ログイン」リンクが無ければログイン済みとみなす）
 */
const isLoggedInOnHope = (): boolean => {
  const currentURL = window.location.href;
  if (!currentURL.startsWith(URLS.HOPE_BASE) || currentURL.includes(URLS.HOPE_LOGIN)) {
    return false;
  }
  return !document.querySelector(SELECTORS.LOGIN_BUTTON);
};

/**
 * HOPEのユーザーメニューにある「ログイン」をクリック
 */
const handleHopePage = async (): Promise<void> => {
  const loginButton = await waitForElement<HTMLAnchorElement>(SELECTORS.LOGIN_BUTTON);

  if (loginButton && loginButton.textContent?.trim() === TEXTS.LOGIN) {
    loginButton.click();
  }
};

/**
 * ログイン種別選択ページで「未来大の学生・教職員」をクリック
 */
const handleLoginSelectionPage = async (): Promise<void> => {
  const ssoLoginLink = await waitForElement<HTMLAnchorElement>(SELECTORS.SSO_LOGIN_LINK);

  if (ssoLoginLink && ssoLoginLink.textContent?.includes(TEXTS.SSO_LINK)) {
    ssoLoginLink.click();
  }
};

/**
 * SSOのログイン画面で、ブラウザに保存されたログイン情報を入力し、フォームを送信する
 */
const handleSSOPage = async (): Promise<void> => {
  // ログインに失敗していたら、以降のログイン補助を一時停止する
  if (detectLoginFailure()) {
    log(MESSAGES.LOGIN_FAILURE_DETECTED, 'error');
    await chrome.storage.local.set<StorageItems>({ blocked: true });
    return;
  }

  const usernameField = await waitForElement<HTMLInputElement>(SELECTORS.USERNAME_FIELD);
  const passwordField = await waitForElement<HTMLInputElement>(SELECTORS.PASSWORD_FIELD);
  const submitButton = await waitForElement<HTMLInputElement>(SELECTORS.SUBMIT_BUTTON);

  if (!usernameField || !passwordField || !submitButton) {
    return;
  }

  // ブラウザに保存されたログイン情報を受け取って入力する
  const credential = await getStoredCredential();
  if (!credential) {
    log(MESSAGES.CREDENTIAL_UNAVAILABLE, 'warn');
    return;
  }

  // 確認ダイアログへの応答を待つ間に状態が変わることがあるため、送信前に再確認する
  if (detectLoginFailure()) {
    log(MESSAGES.LOGIN_FAILURE_DETECTED, 'error');
    await chrome.storage.local.set<StorageItems>({ blocked: true });
    return;
  }

  const { enabled, blocked, loggedOut } = await chrome.storage.local.get<StorageItems>([
    'enabled',
    'blocked',
    'loggedOut',
  ]);
  if (enabled === false) {
    return;
  }
  if (blocked) {
    log(MESSAGES.LOGIN_BLOCKED, 'warn');
    return;
  }
  if (loggedOut) {
    log(MESSAGES.LOGGED_OUT, 'warn');
    return;
  }

  if (!(await recordLoginAttempt())) {
    log(MESSAGES.TOO_MANY_ATTEMPTS, 'error');
    return;
  }

  usernameField.value = credential.id;
  passwordField.value = credential.password;
  submitButton.click();
};

/**
 * 現在のURLに応じて適切な処理を実行する
 */
const routeByURL = async (): Promise<void> => {
  const currentURL = window.location.href;

  if (currentURL.startsWith(URLS.SSO_BASE)) {
    await handleSSOPage();
  } else if (currentURL.startsWith(URLS.HOPE_BASE)) {
    if (currentURL.includes(URLS.HOPE_LOGIN)) {
      await handleLoginSelectionPage();
    } else {
      await handleHopePage();
    }
  }
};

/**
 * メイン処理
 */
const main = async (): Promise<void> => {
  try {
    const { enabled, blocked, loginAttempts, loggedOut } =
      await chrome.storage.local.get<StorageItems>([
        'enabled',
        'blocked',
        'loginAttempts',
        'loggedOut',
      ]);

    // 未設定（undefined）は有効とみなす
    if (enabled === false) {
      return;
    }

    // ログイン済みなら、試行履歴を消去し、一時停止を解除して終了する
    if (isLoggedInOnHope()) {
      if (loginAttempts) {
        await chrome.storage.local.remove<StorageItems>('loginAttempts');
      }
      if (blocked) {
        await chrome.storage.local.remove<StorageItems>('blocked');
        log('ログイン済みのため、ログイン制限を解除しました', 'warn');
      }
      if (loggedOut) {
        await chrome.storage.local.remove<StorageItems>('loggedOut');
      }

      // ログアウトしたら、ユーザーが自分でログインを始めるまでログイン補助を止める
      runBeforeLinkNavigation(SELECTORS.LOGOUT_LINK, () =>
        chrome.storage.local.set<StorageItems>({ loggedOut: true })
      );
      return;
    }

    if (blocked) {
      log(MESSAGES.LOGIN_BLOCKED, 'warn');
      return;
    }

    if (loggedOut) {
      log(MESSAGES.LOGGED_OUT, 'warn');
      // ユーザーが自分で「ログイン」か「未来大の学生・教職員」を押したら、以降の操作を補助する
      runBeforeLinkNavigation(`${SELECTORS.LOGIN_BUTTON}, ${SELECTORS.SSO_LOGIN_LINK}`, () =>
        chrome.storage.local.remove<StorageItems>('loggedOut')
      );
      return;
    }

    await routeByURL();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`${MESSAGES.PROCESSING_ERROR}: ${errorMessage}`, 'error');
  }
};

main();
