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

  function showIframeError(msg) {
    if (msg) iframeErrorMsg.textContent = msg;
    iframeError.classList.add('visible');
  }

  function hideIframeError() {
    iframeError.classList.remove('visible');
  }

  async function probeUrl(url) {
    // Attempt a no-cors fetch to distinguish network failures from framing blocks.
    // A framing block means the server IS reachable but refuses embedding.
    try {
      await fetch(url, { mode: 'no-cors', cache: 'no-store' });
      // Reachable — the server responded (possibly blocking frames)
      return 'The page refused to be displayed in a frame.';
    } catch (e) {
      return `Could not connect: ${e.message}`;
    }
  }

  async function checkIframeLoad(url) {
    // If contentDocument is accessible (same-origin), the browser rendered a
    // local error page — the remote content never loaded.
    // If it throws SecurityError, cross-origin content loaded — that's success.
    try {
      const doc = frame.contentDocument;
      if (!doc || doc.body.innerHTML.trim() === '') {
        const reason = await probeUrl(url);
        showIframeError(reason);
      }
    } catch (e) {
      // SecurityError: cross-origin page loaded successfully
      hideIframeError();
    }
  }

  function loadFrameUrl(url) {
    hideIframeError();
    iframeErrorUrl.textContent = url;
    clearTimeout(loadTimeout);
    frame.src = url;

    // Fallback timeout in case load event never fires
    loadTimeout = setTimeout(async () => {
      try {
        const doc = frame.contentDocument;
        if (!doc || doc.body.innerHTML.trim() === '') {
          const reason = await probeUrl(url);
          showIframeError(reason);
        }
      } catch (e) {
        // Cross-origin — loaded fine
      }
    }, 15000);
  }

  frame.addEventListener('load', () => {
    clearTimeout(loadTimeout);
    const url = Settings.load().url;
    if (url) checkIframeLoad(url);
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
        loadFrameUrl(s.url);
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
