import type { LogType, PasswordCredential } from './types';
import { CONFIG } from './constants';

/**
 * 指定のフォーマットでログを出力
 * @param message ログメッセージ
 * @param type ログレベル（warn または error）
 */
export const log = (message: string, type: LogType = 'warn'): void => {
  const prefix = '[FUN Login Helper]';
  switch (type) {
    case 'warn': {
      console.warn(`${prefix} ${message}`);
      break;
    }
    case 'error': {
      console.error(`${prefix} ${message}`);
      break;
    }
  }
};

/**
 * ブラウザに保存されたログイン情報を Credential Management API で受け取る
 * （自動ログインできる状態なら確認なしで、そうでなければ確認画面またはアカウント選択画面で選ばれたものを受け取る）
 * @returns 受け取ったログイン情報。未対応、またはキャンセルされたら null
 */
export const getStoredCredential = async (): Promise<PasswordCredential | null> => {
  if (!('PasswordCredential' in window)) {
    return null;
  }

  const credential = await navigator.credentials.get({ password: true, mediation: 'optional' });
  return credential?.type === 'password' ? (credential as PasswordCredential) : null;
};

/**
 * 指定されたセレクタのリンクがクリックされたら、遷移の前に処理を実行する
 * （遷移でページが破棄される前に、ストレージへの保存を終わらせるため）
 * @param selector 対象のリンクのCSSセレクタ
 * @param task 遷移の前に実行する処理
 */
export const runBeforeLinkNavigation = (selector: string, task: () => Promise<void>): void => {
  document.addEventListener(
    'click',
    event => {
      // 新しいタブで開くなどの操作は、ブラウザの標準動作に任せる
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      // ユーザーメニューは後から描画されるため、クリックされた要素から判定する
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(selector);
      if (!link) {
        return;
      }

      event.preventDefault();
      task()
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          log(`遷移前の処理に失敗しました: ${errorMessage}`, 'error');
        })
        // 処理に失敗しても、ユーザーが押したリンクには遷移する
        .finally(() => window.location.assign(link.href));
    },
    // ページ側の処理より先に受け取る
    true
  );
};

/**
 * 指定されたセレクタのDOM要素が出現するまで待機
 * @param selector 待機するDOM要素のCSSセレクタ
 * @param timeout タイムアウト時間（ミリ秒）
 * @returns 見つかった要素またはnull
 */
export const waitForElement = <T extends Element = Element>(
  selector: string,
  timeout: number = CONFIG.DEFAULT_TIMEOUT
): Promise<T | null> => {
  return new Promise(resolve => {
    // 既に要素が存在する場合はすぐに解決
    const element = document.querySelector<T>(selector);
    if (element) {
      resolve(element);
      return;
    }

    // MutationObserverでDOM変更を監視
    const observer = new MutationObserver(() => {
      const element = document.querySelector<T>(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    // document.bodyでDOM変更を監視
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // 指定時間後にタイムアウト
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
};
