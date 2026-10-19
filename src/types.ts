/** chrome.storage.local に保存するデータ */
export interface StorageItems {
  /** ログイン補助の有効/無効（未設定は有効とみなす） */
  enabled?: boolean;
  /** ログイン補助を一時停止しているか */
  blocked?: boolean;
  /** ログインを試みた時刻（ミリ秒）。短時間の繰り返しを検出するため、フォームの送信前に記録する */
  loginAttempts?: number[];
  /** HOPE からログアウトしたか。ユーザーが自分でログインを始めるまで、ログイン補助を止める */
  loggedOut?: boolean;
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

/** ブラウザに保存されたパスワード（Chrome Credential Management API） */
export interface PasswordCredential extends Credential {
  readonly type: 'password';
  readonly password: string;
}

declare global {
  interface CredentialRequestOptions {
    password?: boolean;
  }
}
