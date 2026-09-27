/** chrome.storage.local に保存するデータ */
export interface StorageItems {
  /** ログイン補助の有効/無効（未設定は有効とみなす） */
  enabled?: boolean;
  /** ログイン失敗によりログイン補助を一時停止しているか */
  blocked?: boolean;
  /** ログイン送信の時刻（ミリ秒）。短時間の連続送信を検出するために使う */
  loginAttempts?: number[];
}

/** ログ出力の種類 */
export type LogType = 'warn' | 'error';

/** ポップアップのDOM要素取得関数 */
export interface PopupElements {
  enableToggle: () => HTMLInputElement | null;
  resetButton: () => HTMLButtonElement | null;
  statusDiv: () => HTMLDivElement | null;
}

/** ステータス表示の種類 */
export type StatusType = 'success' | 'error';
