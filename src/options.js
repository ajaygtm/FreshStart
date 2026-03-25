'use strict';

// ── DOM references ───────────────────────────────────────────────────────────

const nicknameInput = document.getElementById('nickname');
const nicknameCount = document.getElementById('nickname-count');
const apiKeyInput = document.getElementById('api-key');
const toggleKeyBtn = document.getElementById('toggle-key');
const clearCacheBtn = document.getElementById('clear-cache-btn');
const saveBtn = document.getElementById('save-btn');
const statusEl = document.getElementById('status');

// ── Helpers ──────────────────────────────────────────────────────────────────

let statusTimer = null;

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusEl.textContent = '';
    statusEl.className = 'status';
  }, 3000);
}

function updateCharCount() {
  nicknameCount.textContent = `${nicknameInput.value.length}/8`;
}

// ── Load saved settings ──────────────────────────────────────────────────────

function loadSettings() {
  nicknameInput.value = localStorage.getItem('user_nickname') || '';
  apiKeyInput.value = localStorage.getItem('unsplash_api_key') || '';
  updateCharCount();
}

// ── Event listeners ──────────────────────────────────────────────────────────

nicknameInput.addEventListener('input', updateCharCount);

toggleKeyBtn.addEventListener('click', () => {
  const isHidden = apiKeyInput.type === 'password';
  apiKeyInput.type = isHidden ? 'text' : 'password';
  toggleKeyBtn.textContent = isHidden ? 'Hide' : 'Show';
});

saveBtn.addEventListener('click', saveSettings);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveSettings();
});

clearCacheBtn.addEventListener('click', () => {
  localStorage.removeItem('cached_photos');
  localStorage.removeItem('last_refresh');
  localStorage.removeItem('current_photo_index');
  showStatus('✓ Cache cleared! Photos will refresh on next new tab.', 'success');
});

// ── Save ─────────────────────────────────────────────────────────────────────

function saveSettings() {
  const nickname = nicknameInput.value.trim().slice(0, 8);
  const apiKey = apiKeyInput.value.trim();

  if (nicknameInput.value.trim().length > 8) {
    showStatus('✗ Nickname must be 8 characters or fewer.', 'error');
    return;
  }

  localStorage.setItem('user_nickname', nickname);
  localStorage.setItem('unsplash_api_key', apiKey);
  showStatus('✓ Settings saved!', 'success');
}

// ── Init ─────────────────────────────────────────────────────────────────────

loadSettings();
