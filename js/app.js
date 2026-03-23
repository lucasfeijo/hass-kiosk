document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const helloWorld = document.getElementById('hello-world');
  const frame = document.getElementById('kiosk-frame');
  const menuBtn = document.getElementById('menu-btn');
  const modal = document.getElementById('settings-modal');
  const urlInput = document.getElementById('setting-url');
  const refreshInput = document.getElementById('setting-refresh');
  const interactionCheck = document.getElementById('setting-interaction');
  const saveBtn = document.getElementById('btn-save');
  const cancelBtn = document.getElementById('btn-cancel');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const iframeError = document.getElementById('iframe-error');
  const iframeErrorMsg = document.getElementById('iframe-error-msg');
  const iframeErrorUrl = document.getElementById('iframe-error-url');
  const iframeErrorRetry = document.getElementById('iframe-error-retry');
  const iframeErrorSettings = document.getElementById('iframe-error-settings');

  let loadTimeout = null;
  let lastLoadFailed = false;

  function showIframeError(msg) {
    if (msg) iframeErrorMsg.textContent = msg;
    iframeError.classList.add('visible');
    lastLoadFailed = true;
  }

  function hideIframeError() {
    iframeError.classList.remove('visible');
    lastLoadFailed = false;
  }

  function checkIframeLoad() {
    try {
      const doc = frame.contentDocument;
      if (doc === null) {
        // Cross-origin content loaded (some browsers return null instead of throwing)
        hideIframeError();
        return;
      }
      // Accessible contentDocument means browser rendered a local/blank page — load failed
      if (!doc.body || doc.body.innerHTML.trim() === '') {
        showIframeError('Page failed to load.');
      }
    } catch (e) {
      // SecurityError: cross-origin content loaded successfully
      hideIframeError();
    }
  }

  function loadFrameUrl(url) {
    if (!lastLoadFailed) hideIframeError();
    iframeErrorUrl.textContent = url;
    clearTimeout(loadTimeout);
    frame.src = url;

    // Fallback timeout in case load event never fires
    loadTimeout = setTimeout(() => {
      checkIframeLoad();
    }, 8000);
  }

  frame.addEventListener('load', () => {
    clearTimeout(loadTimeout);
    checkIframeLoad();
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // Load and apply settings
  function applySettings() {
    const s = Settings.load();

    if (s.url) {
      frame.classList.add('active');
      helloWorld.style.display = 'none';
      loadFrameUrl(s.url);
    } else {
      frame.classList.remove('active');
      frame.removeAttribute('src');
      hideIframeError();
      helloWorld.style.display = '';
    }

    // Auto-refresh
    AutoRefresh.stop();
    if (s.url && s.autoRefreshMinutes > 0) {
      AutoRefresh.start(s.autoRefreshMinutes, () => {
        if (!lastLoadFailed) loadFrameUrl(s.url);
      });
      if (s.restartTimerOnInteraction) {
        AutoRefresh.attachInteractionListeners();
      }
    }
  }

  // Populate modal form from settings
  function populateForm() {
    const s = Settings.load();
    urlInput.value = s.url;
    refreshInput.value = s.autoRefreshMinutes || '';
    interactionCheck.checked = s.restartTimerOnInteraction;
  }

  // Open modal
  function openModal() {
    populateForm();
    modal.classList.add('open');
  }

  // Close modal
  function closeModal() {
    modal.classList.remove('open');
  }

  // Save settings
  function saveSettings() {
    const url = urlInput.value.trim();
    const minutes = parseInt(refreshInput.value, 10) || 0;
    const interaction = interactionCheck.checked;

    Settings.save({
      url,
      autoRefreshMinutes: minutes,
      restartTimerOnInteraction: interaction,
    });

    closeModal();
    applySettings();
  }

  // Iframe error buttons
  iframeErrorRetry.addEventListener('click', () => {
    lastLoadFailed = false;
    hideIframeError();
    const s = Settings.load();
    if (s.url) loadFrameUrl(s.url);
  });
  iframeErrorSettings.addEventListener('click', openModal);

  // Event listeners
  menuBtn.addEventListener('click', openModal);
  openSettingsBtn.addEventListener('click', openModal);
  cancelBtn.addEventListener('click', closeModal);
  saveBtn.addEventListener('click', saveSettings);

  // Close modal on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });

  // Save on Enter in URL field
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveSettings();
  });

  // Initial load
  applySettings();
});
