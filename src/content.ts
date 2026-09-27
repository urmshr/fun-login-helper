import { URLS, SELECTORS, TEXTS, CONFIG, MESSAGES } from './constants';
import type { StorageItems } from './types';
import { log, waitForElement, waitForAutofill } from './utils';

/**
 * SSOのログイン画面にエラーが表示されているかを判定する
 */
const detectLoginFailure = (): boolean => {
  const errorElement = document.querySelector(SELECTORS.LOGIN_ERROR);
  return !!(errorElement && errorElement.textContent?.trim() !== '');
};

/**
 * ログイン送信を記録する。短時間に送信を繰り返していたら記録せず、ログイン補助を一時停止する
 * @returns 送信してよければ true
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
 * SSOのログイン画面で、パスワードマネージャーによる入力を待って送信する
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

  // パスワードマネージャーに自動入力を促す
  usernameField.focus();

  // 両フィールドが充填されるまで待機する
  const filled = await waitForAutofill([usernameField, passwordField]);
  if (!filled) {
    log('自動入力が検出されなかったため、ログイン送信をスキップします', 'warn');
    return;
  }

  if (!(await recordLoginAttempt())) {
    log(MESSAGES.TOO_MANY_ATTEMPTS, 'error');
    return;
  }

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
    const { enabled, blocked, loginAttempts } = await chrome.storage.local.get<StorageItems>([
      'enabled',
      'blocked',
      'loginAttempts',
    ]);

    // 未設定（undefined）は有効とみなす
    if (enabled === false) {
      return;
    }

    // ログイン済みなら、送信の記録を消し、一時停止中であれば解除して終了する
    if (isLoggedInOnHope()) {
      if (loginAttempts) {
        await chrome.storage.local.remove<StorageItems>('loginAttempts');
      }
      if (blocked) {
        await chrome.storage.local.remove<StorageItems>('blocked');
        log('ログイン済みのため、ログイン制限を解除しました', 'warn');
      }
      return;
    }

    if (blocked) {
      log(MESSAGES.LOGIN_BLOCKED, 'warn');
      return;
    }

    await routeByURL();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`${MESSAGES.PROCESSING_ERROR}: ${errorMessage}`, 'error');
  }
};

main();
