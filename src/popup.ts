import type { PopupElements, StatusType, StorageItems } from './types';
import { log } from './utils';

// DOM要素の取得
const elements: PopupElements = {
  enableToggle: () => document.getElementById('enableToggle') as HTMLInputElement | null,
  resetButton: () => document.getElementById('resetBlock') as HTMLButtonElement | null,
  statusDiv: () => document.getElementById('status') as HTMLDivElement | null,
};

const MESSAGES = {
  BLOCKED:
    'ログイン失敗によりログイン補助を一時停止中です。HOPE にログインすると自動で解除されます',
  RESET_SUCCESS: 'ログイン制限を解除しました。次回アクセス時からログイン補助を再開します',
  SAVE_FAILED: '設定の保存に失敗しました',
  LOAD_FAILED: '設定の読み込みに失敗しました',
} as const;

/**
 * ステータスメッセージを表示する
 */
const showStatus = (message: string, type: StatusType = 'success'): void => {
  const statusDiv = elements.statusDiv();
  if (!statusDiv) {
    return;
  }

  statusDiv.textContent = message;
  statusDiv.className = `status ${type} show`;
};

/**
 * ログイン制限の解除ボタンの表示を切り替える
 */
const setResetButtonVisible = (visible: boolean): void => {
  const resetButton = elements.resetButton();
  if (resetButton) {
    resetButton.hidden = !visible;
  }
};

/**
 * ログイン補助の有効/無効を切り替える
 */
const handleToggleChange = async (): Promise<void> => {
  const toggle = elements.enableToggle();
  if (!toggle) {
    return;
  }

  const enabled = toggle.checked;

  try {
    await chrome.storage.local.set<StorageItems>({ enabled });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    showStatus(`${MESSAGES.SAVE_FAILED}: ${errorMessage}`, 'error');
    // 保存に失敗した場合は表示を元に戻す
    toggle.checked = !enabled;
  }
};

/**
 * ログイン失敗によるブロック状態を解除する
 */
const handleResetBlock = async (): Promise<void> => {
  try {
    await chrome.storage.local.remove<StorageItems>(['blocked', 'loginAttempts']);
    setResetButtonVisible(false);
    showStatus(MESSAGES.RESET_SUCCESS);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    showStatus(`${MESSAGES.SAVE_FAILED}: ${errorMessage}`, 'error');
  }
};

/**
 * 保存済みの設定をUIに反映する
 */
const loadSettings = async (): Promise<void> => {
  try {
    const items = await chrome.storage.local.get<StorageItems>(['enabled', 'blocked']);

    const toggle = elements.enableToggle();
    if (toggle) {
      // 未設定（undefined）は有効とみなす
      toggle.checked = items.enabled !== false;
    }

    if (items.blocked === true) {
      showStatus(MESSAGES.BLOCKED, 'error');
      setResetButtonVisible(true);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`${MESSAGES.LOAD_FAILED}: ${errorMessage}`, 'error');
  }
};

/**
 * イベントリスナーを設定する
 */
const setupEventListeners = (): void => {
  elements.enableToggle()?.addEventListener('change', handleToggleChange);
  elements.resetButton()?.addEventListener('click', handleResetBlock);
};

// DOM読み込み完了時の初期化処理
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});
