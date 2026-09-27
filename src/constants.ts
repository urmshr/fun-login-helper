// URL
export const URLS = {
  HOPE_BASE: 'https://hope.fun.ac.jp/',
  HOPE_LOGIN: '/local/hope/login.php',
  SSO_BASE: 'https://sso.fun.ac.jp/my.policy',
} as const;

// DOMセレクタ
export const SELECTORS = {
  LOGIN_BUTTON: '.usermenu .login a',
  SSO_LOGIN_LINK: 'a[href*="auth/saml2/login.php"]',
  USERNAME_FIELD: 'input[name="username"]',
  PASSWORD_FIELD: 'input[name="password"]',
  SUBMIT_BUTTON: 'input[type="submit"][value="ログイン"]',
  LOGIN_ERROR: '#credentials_table_postheader',
} as const;

// 要素の判定に使うページ上のテキスト
export const TEXTS = {
  LOGIN: 'ログイン',
  SSO_LINK: '未来大の学生・教職員',
} as const;

// 待機時間（ミリ秒）
export const CONFIG = {
  DEFAULT_TIMEOUT: 10000,
  AUTOFILL_TIMEOUT: 15000,
  AUTOFILL_POLL_INTERVAL: 300,
  // この時間内に MAX_LOGIN_ATTEMPTS 回送信していたら、以降の送信を止める
  LOGIN_ATTEMPT_WINDOW: 10 * 60 * 1000,
  MAX_LOGIN_ATTEMPTS: 3,
} as const;

// コンソールに出力するメッセージ
export const MESSAGES = {
  LOGIN_BLOCKED:
    'ログインに失敗したため、ログイン補助を一時停止中です。パスワードマネージャーに保存された情報を確認してください（HOPE にログインすると自動で解除されます）。',
  LOGIN_FAILURE_DETECTED:
    'ログイン失敗を検出しました。パスワードマネージャーに保存されたパスワードが最新か確認してください。',
  TOO_MANY_ATTEMPTS:
    '短時間にログインを繰り返したため、ログイン補助を一時停止しました。パスワードマネージャーに保存された情報を確認してください。',
  PROCESSING_ERROR:
    '処理中にエラーが発生しました。ページを再読み込みするか、拡張機能の設定を確認してください。',
} as const;
