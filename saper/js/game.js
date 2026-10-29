(function (K) {
  'use strict';

  /* Reguły sapera, bez ekranu. Plansza to płaskie tablice — łatwo je zapisać
     w pamięci przeglądarki i odtworzyć po zamknięciu apki.
       mine[i]  1 = mina
       num[i]   ile min wokół pola
       view[i]  0 zakryte, 1 odkryte, 2 flaga
     Miny padają dopiero po pierwszym dotknięciu i omijają to pole oraz jego
     sąsiadów, więc pierwszy ruch zawsze otwiera kawałek planszy. */

  const LEVELS = {
    latwy: { id: 'latwy', label: 'Łatwy', rows: 9, cols: 9, mines: 10 },
    sredni: { id: 'sredni', label: 'Średni', rows: 16, cols: 16, mines: 40 },
    // klasyczny ekspert 16×30, obrócony na pionowy ekran telefonu
    trudny: { id: 'trudny', label: 'Trudny', rows: 30, cols: 16, mines: 99 }
  };
  const ORDER = ['latwy', 'sredni', 'trudny'];

  function create(levelId) {
    const lv = LEVELS[levelId] || LEVELS.latwy;
    const n = lv.rows * lv.cols;
    return {
      level: lv.id,
      rows: lv.rows,
      cols: lv.cols,
      mines: lv.mines,
      mine: new Array(n).fill(0),
      num: new Array(n).fill(0),
      view: new Array(n).fill(0),
      status: 'ready',          // ready → play → won | lost
      elapsed: 0,
      exploded: -1
    };
  }

  function neighbors(g, i) {
    const r = Math.floor(i / g.cols), c = i % g.cols, out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < g.rows && cc >= 0 && cc < g.cols) out.push(rr * g.cols + cc);
      }
    }
    return out;
  }

  function lay(g, safe, rand) {
    const n = g.mine.length;
    const keep = new Set([safe].concat(neighbors(g, safe)));
    // na ciasnej planszy wystarczy, że bezpieczne jest samo pole
    if (n - keep.size < g.mines) keep.clear(), keep.add(safe);
    const pool = [];
    for (let i = 0; i < n; i++) if (!keep.has(i)) pool.push(i);
    for (let k = 0; k < g.mines; k++) {
      const j = k + Math.floor(rand() * (pool.length - k));
      const t = pool[k]; pool[k] = pool[j]; pool[j] = t;
      g.mine[pool[k]] = 1;
    }
    for (let i = 0; i < n; i++) {
      g.num[i] = neighbors(g, i).reduce(function (s, j) { return s + g.mine[j]; }, 0);
    }
  }

  function closedSafe(g) {
    let left = 0;
    for (let i = 0; i < g.view.length; i++) if (g.view[i] !== 1 && !g.mine[i]) left++;
    return left;
  }

  function finish(g, won) {
    g.status = won ? 'won' : 'lost';
    if (won) for (let i = 0; i < g.view.length; i++) if (g.mine[i]) g.view[i] = 2;
  }

  // Odkrywa pole, a przy zerze rozlewa się na sąsiadów. Zwraca odkryte
  // pola z odległością od dotkniętego — z niej bierze się fala na ekranie.
  function open(g, i, rand) {
    const res = { opened: [], boom: false };
    if (g.status === 'won' || g.status === 'lost' || g.view[i] !== 0) return res;
    if (g.status === 'ready') {
      lay(g, i, rand || Math.random);
      g.status = 'play';
    }
    if (g.mine[i]) {
      g.view[i] = 1;
      g.exploded = i;
      res.boom = true;
      finish(g, false);
      return res;
    }
    const queue = [[i, 0]];
    g.view[i] = 1;
    while (queue.length) {
      const cur = queue.shift();
      res.opened.push({ i: cur[0], d: cur[1] });
      if (g.num[cur[0]]) continue;
      neighbors(g, cur[0]).forEach(function (j) {
        if (g.view[j] === 0 && !g.mine[j]) {
          g.view[j] = 1;
          queue.push([j, cur[1] + 1]);
        }
      });
    }
    if (!closedSafe(g)) finish(g, true);
    return res;
  }

  // Dotknięcie odkrytej liczby, wokół której stoi tyle samo flag:
  // otwiera resztę sąsiadów naraz. Zła flaga kończy się wybuchem.
  function chord(g, i) {
    const res = { opened: [], boom: false };
    if (g.status !== 'play' || g.view[i] !== 1 || !g.num[i]) return res;
    const around = neighbors(g, i);
    const flags = around.filter(function (j) { return g.view[j] === 2; }).length;
    if (flags !== g.num[i]) return res;
    around.forEach(function (j) {
      if (g.status !== 'play' || g.view[j] !== 0) return;
      const r = open(g, j);
      r.opened.forEach(function (o) { res.opened.push({ i: o.i, d: o.d + 1 }); });
      if (r.boom) res.boom = true;
    });
    return res;
  }

  function toggleFlag(g, i) {
    if (g.status === 'won' || g.status === 'lost' || g.view[i] === 1) return false;
    g.view[i] = g.view[i] === 2 ? 0 : 2;
    return true;
  }

  function flagsLeft(g) {
    return g.mines - g.view.filter(function (v) { return v === 2; }).length;
  }

  // 7,4 s albo 1:02,3 — czasy z dokładnością do dziesiątej części sekundy
  K.fmtTime = function (ms) {
    const tenths = Math.floor(ms / 100);
    const s = Math.floor(tenths / 10), frac = ',' + (tenths % 10);
    return s < 60 ? s + frac + ' s' : Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + frac;
  };

  K.game = {
    LEVELS: LEVELS,
    ORDER: ORDER,
    create: create,
    neighbors: neighbors,
    open: open,
    chord: chord,
    toggleFlag: toggleFlag,
    flagsLeft: flagsLeft
  };
})(window.K = window.K || {});
