import type { LogType } from './types';
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
 * 指定された入力欄がパスワードマネージャー等により自動入力されたかを判定
 * @param el 対象の input 要素
 * @returns 自動入力（またはユーザー入力）済みなら true
 */
const isFieldFilled = (el: HTMLInputElement): boolean => {
  if (el.value.length > 0) {
    return true;
  }

  // ユーザー操作前の自動入力値はスクリプトから読めないため、疑似クラスでも判定する
  for (const selector of [':-webkit-autofill', ':autofill']) {
    try {
      if (el.matches(selector)) {
        return true;
      }
    } catch {
      // 未対応セレクタは無視
    }
  }

  return false;
};

/**
 * すべての入力欄が自動入力されるまで待機する
 * @param fields 監視する input 要素の配列
 * @param timeout タイムアウト時間（ミリ秒）
 * @returns すべて充填されたら true、タイムアウトしたら false
 */
export const waitForAutofill = (
  fields: HTMLInputElement[],
  timeout: number = CONFIG.AUTOFILL_TIMEOUT
): Promise<boolean> => {
  return new Promise(resolve => {
    const allFilled = (): boolean => fields.every(isFieldFilled);

    // 既に充填済みならすぐに解決
    if (allFilled()) {
      resolve(true);
      return;
    }

    let settled = false;
    const finish = (result: boolean): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      fields.forEach(field => {
        field.removeEventListener('input', check);
        field.removeEventListener('change', check);
      });
      resolve(result);
    };

    // クリック選択による充填は input/change イベントで即座に検知
    const check = (): void => {
      if (allFilled()) {
        finish(true);
      }
    };

    fields.forEach(field => {
      field.addEventListener('input', check);
      field.addEventListener('change', check);
    });

    // 読込時自動入力（イベントが発火しない）のためのポーリング
    const intervalId = setInterval(check, CONFIG.AUTOFILL_POLL_INTERVAL);
    const timeoutId = setTimeout(() => finish(false), timeout);
  });
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
