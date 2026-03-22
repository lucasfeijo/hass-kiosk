const Settings = {
  _key: 'hass-kiosk-settings',
  _defaults: {
    url: '',
    autoRefreshMinutes: 0,
    restartTimerOnInteraction: true,
  },

  load() {
    try {
      const raw = localStorage.getItem(this._key);
      return { ...this._defaults, ...(raw ? JSON.parse(raw) : {}) };
    } catch {
      return { ...this._defaults };
    }
  },

  save(obj) {
    const current = this.load();
    const merged = { ...current, ...obj };
    localStorage.setItem(this._key, JSON.stringify(merged));
    return merged;
  },

  get(key) {
    return this.load()[key];
  },

  set(key, value) {
    return this.save({ [key]: value });
  },
};
