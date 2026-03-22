const AutoRefresh = {
  _timerId: null,
  _intervalMs: 0,
  _onRefresh: null,
  _debounceId: null,
  _interactionBound: null,

  start(minutes, onRefresh) {
    this.stop();
    if (!minutes || minutes <= 0) return;
    this._intervalMs = minutes * 60 * 1000;
    this._onRefresh = onRefresh;
    this._timerId = setInterval(() => {
      if (this._onRefresh) this._onRefresh();
    }, this._intervalMs);
  },

  stop() {
    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
    this._intervalMs = 0;
    this._onRefresh = null;
    this.detachInteractionListeners();
  },

  restart() {
    if (!this._onRefresh || !this._intervalMs) return;
    clearInterval(this._timerId);
    this._timerId = setInterval(() => {
      if (this._onRefresh) this._onRefresh();
    }, this._intervalMs);
  },

  isRunning() {
    return this._timerId !== null;
  },

  attachInteractionListeners() {
    if (this._interactionBound) return;
    this._interactionBound = () => {
      clearTimeout(this._debounceId);
      this._debounceId = setTimeout(() => this.restart(), 1000);
    };
    document.addEventListener('pointerdown', this._interactionBound, true);
    document.addEventListener('keydown', this._interactionBound, true);
  },

  detachInteractionListeners() {
    if (!this._interactionBound) return;
    document.removeEventListener('pointerdown', this._interactionBound, true);
    document.removeEventListener('keydown', this._interactionBound, true);
    clearTimeout(this._debounceId);
    this._interactionBound = null;
  },
};
