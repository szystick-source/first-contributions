(function (K) {
  'use strict';

  const KEY = 'saper.v1';
  const LEVELS = ['latwy', 'sredni', 'trudny'];
  const KEEP_TIMES = 10;
  const listeners = new Set();

  const blankStats = () => ({ played: 0, won: 0, streak: 0, bestStreak: 0, times: [] });

  const empty = () => ({
    version: 1,
    settings: { theme: 'auto', vibrate: true, chord: true, level: 'latwy' },
    stats: { latwy: blankStats(), sredni: blankStats(), trudny: blankStats() },
    // rozgrywka w toku — zamknięcie apki w połowie nie zabiera planszy
    current: null
  });

  function canPersist() {
    try {
      localStorage.setItem(KEY + '.probe', '1');
      localStorage.removeItem(KEY + '.probe');
      return true;
    } catch (e) {
      return false;
    }
  }

  function normalize(data) {
    const base = empty();
    if (!data || typeof data !== 'object') return base;
    base.settings = Object.assign(base.settings, data.settings || {});
    LEVELS.forEach(function (id) {
      const s = Object.assign(blankStats(), (data.stats || {})[id] || {});
      if (!Array.isArray(s.times)) s.times = [];
      base.stats[id] = s;
    });
    if (data.current && Array.isArray(data.current.mine)) base.current = data.current;
    return base;
  }

  function read() {
    if (!persistent) return empty();
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? normalize(JSON.parse(raw)) : empty();
    } catch (e) {
      console.warn('Saper: nie udało się odczytać zapisanych danych.', e);
      return empty();
    }
  }

  let persistent = canPersist();
  let state = read();
  let pending = null;

  function write() {
    if (!persistent) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      persistent = false;
      if (K.ui) K.ui.toast('Nie mogę zapisać danych — pamięć przeglądarki jest pełna albo zablokowana.');
    }
  }

  function flush() {
    if (pending) {
      clearTimeout(pending);
      pending = null;
      write();
    }
  }

  K.store = {
    get state() { return state; },
    get persistent() { return persistent; },

    // Zmiana ustawień albo rekordów: zapisz od razu i daj znać widokom.
    update: function (fn) {
      fn(state);
      flush();
      write();
      listeners.forEach(function (cb) { cb(state); });
    },

    // Ruch na planszy — zapis z opóźnieniem i bez przerysowania widoku.
    silent: function (fn) {
      fn(state);
      if (pending) clearTimeout(pending);
      pending = setTimeout(function () { pending = null; write(); }, 300);
    },

    onChange: function (cb) {
      listeners.add(cb);
      return function () { listeners.delete(cb); };
    },

    // Wynik zakończonej gry. Zwraca miejsce czasu na liście (0 = rekord),
    // albo -1, gdy gra była przegrana lub czas nie zmieścił się w dziesiątce.
    record: function (level, won, ms) {
      let place = -1;
      this.update(function (s) {
        const st = s.stats[level];
        st.played += 1;
        if (!won) { st.streak = 0; return; }
        st.won += 1;
        st.streak += 1;
        st.bestStreak = Math.max(st.bestStreak, st.streak);
        const entry = { ms: ms, at: new Date().toISOString() };
        st.times.push(entry);
        st.times.sort(function (a, b) { return a.ms - b.ms; });
        st.times = st.times.slice(0, KEEP_TIMES);
        place = st.times.indexOf(entry);
      });
      return place;
    },

    resetStats: function () {
      this.update(function (s) {
        LEVELS.forEach(function (id) { s.stats[id] = blankStats(); });
      });
    },

    flush: flush
  };

  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });
})(window.K = window.K || {});
