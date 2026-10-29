(function (K) {
  'use strict';

  const ui = K.ui;
  const h = ui.h;
  const icon = ui.icon;
  const LONG_PRESS = 360;

  let g = null;            // bieżąca plansza, przeżywa przejścia między zakładkami
  let mode = 'open';       // co robi zwykłe dotknięcie: 'open' albo 'flag'
  let cells = [];
  let boardEl = null, minesEl = null, clockEl = null, restartEl = null, resultEl = null, hintEl = null, segEl = null;
  let since = 0, ticker = 0;
  let press = null, lastTouch = 0, focusIdx = 0;

  function game() {
    if (!g) {
      const saved = K.store.state.current;
      g = saved && K.game.LEVELS[saved.level] && saved.mine.length === saved.rows * saved.cols
        ? saved
        : K.game.create(K.store.state.settings.level);
    }
    return g;
  }

  function buzz(pattern) {
    if (!K.store.state.settings.vibrate) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }

  /* ---------- zegar ----------
     Liczy tylko wtedy, gdy plansza jest na ekranie: przejście do rekordów
     albo schowanie apki zatrzymuje czas, a powrót go wznawia. */

  function elapsed() { return g.elapsed + (since ? performance.now() - since : 0); }
  function run() {
    if (since || !g || g.status !== 'play' || document.hidden || !boardEl) return;
    since = performance.now();
    ticker = setInterval(showClock, 250);
  }
  function pause() {
    if (!since) return;
    g.elapsed = elapsed();
    since = 0;
    clearInterval(ticker);
  }
  function clock(ms) {
    const s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function showClock() { if (clockEl) clockEl.lastChild.textContent = clock(elapsed()); }

  function save() {
    const snap = Object.assign({}, g, { elapsed: Math.round(elapsed()) });
    K.store.silent(function (s) { s.current = snap; });
  }

  /* ---------- rysowanie pól ---------- */

  function paint(i, delay, anim) {
    const el = cells[i];
    const v = g.view[i], lost = g.status === 'lost';
    let cls = 'cell', key, label;

    if (v === 2) {
      const wrong = lost && !g.mine[i];
      cls += ' flag' + (wrong ? ' wrong' : '');
      key = wrong ? 'w' : 'f';
      label = wrong ? 'błędna flaga' : 'flaga';
    } else if (v === 1 || (lost && g.mine[i])) {
      if (g.mine[i]) {
        cls += ' open mine' + (i === g.exploded ? ' boom' : '');
        key = 'm';
        label = 'mina';
      } else {
        cls += ' open' + (g.num[i] ? ' n' + g.num[i] : '');
        key = 'o' + g.num[i];
        label = g.num[i] ? String(g.num[i]) : 'puste';
      }
    } else {
      key = 'c';
      label = 'zakryte';
    }

    if (anim) cls += ' ' + anim;
    el.className = cls;
    if (delay !== undefined) el.style.setProperty('--d', Math.min(delay, 520) + 'ms');
    if (el.dataset.k === key) return;
    el.dataset.k = key;
    el.textContent = '';
    if (key === 'f' || key === 'w') el.appendChild(icon('flag'));
    else if (key === 'm') el.appendChild(icon('mine'));
    else if (key.charAt(0) === 'o' && g.num[i]) el.textContent = g.num[i];
    const r = Math.floor(i / g.cols) + 1, c = i % g.cols + 1;
    el.setAttribute('aria-label', 'Wiersz ' + r + ', kolumna ' + c + ': ' + label);
  }

  function updateHud() {
    const left = K.game.flagsLeft(g);
    minesEl.lastChild.textContent = left;
    minesEl.classList.toggle('low', left < 0);
    showClock();
    restartEl.className = 'restart' + (g.status === 'won' ? ' won' : g.status === 'lost' ? ' lost' : '');
    restartEl.textContent = '';
    restartEl.appendChild(icon(g.status === 'won' ? 'star' : 'restart'));
  }

  function distance(a, b) {
    const ra = Math.floor(a / g.cols), rb = Math.floor(b / g.cols);
    return Math.max(Math.abs(ra - rb), Math.abs(a % g.cols - b % g.cols));
  }

  /* ---------- ruch ---------- */

  function act(i, kind) {
    if (g.status === 'won' || g.status === 'lost') return;
    const before = g.status;
    let res = null;

    if (g.view[i] === 1) {
      if (K.store.state.settings.chord) res = K.game.chord(g, i);
    } else if (kind === 'flag') {
      if (K.game.toggleFlag(g, i)) { paint(i); buzz(8); }
    } else if (g.view[i] === 0) {
      res = K.game.open(g, i);
    }

    if (res) res.opened.forEach(function (o) { paint(o.i, o.d * 26, 'reveal'); });
    if (before === 'ready' && g.status !== 'ready') showHint();
    run();
    if (g.status === 'lost') lose();
    else if (g.status === 'won') win(i);
    updateHud();
    save();
  }

  function lose() {
    pause();
    buzz([40, 50, 90]);
    boardEl.classList.add('shake');
    for (let i = 0; i < g.view.length; i++) {
      if (g.mine[i] && g.view[i] !== 2) paint(i, i === g.exploded ? 0 : 140 + distance(i, g.exploded) * 45, 'blast');
      else if (g.view[i] === 2 && !g.mine[i]) paint(i);
    }
    K.store.record(g.level, false);
    showResult(-1);
    bringResult();
  }

  function win(from) {
    pause();
    g.elapsed = Math.round(g.elapsed);
    buzz([18, 40, 18, 40, 30]);
    for (let i = 0; i < g.view.length; i++) {
      if (g.mine[i]) paint(i, 60 + distance(i, from) * 40);
    }
    boardEl.classList.add('cheer');
    const place = K.store.record(g.level, true, g.elapsed);
    showResult(place);
    bringResult();
  }

  function showResult(place) {
    resultEl.textContent = '';
    if (g.status !== 'won' && g.status !== 'lost') return;
    const won = g.status === 'won';
    const stats = K.store.state.stats[g.level];
    let title, sub;
    if (won) {
      title = 'Rozbrojone w ' + K.fmtTime(g.elapsed);
      sub = place === 0 ? (stats.times.length > 1 ? 'Nowy rekord — poprzedni padł.' : 'Pierwszy czas na tym poziomie.')
        : place > 0 ? place + 1 + '. czas na liście. Rekord: ' + K.fmtTime(stats.times[0].ms) + '.'
        : 'Rekord: ' + K.fmtTime(stats.times[0].ms) + '.';
    } else {
      const safe = g.view.length - g.mines;
      const opened = g.view.filter(function (v, i) { return v === 1 && !g.mine[i]; }).length;
      title = 'Bum.';
      sub = 'Odkryte ' + Math.round(opened / safe * 100) + '% planszy. Następna pójdzie lepiej.';
    }
    resultEl.appendChild(ui.card({ class: 'tight' },
      h('div', { class: 'result' + (won ? '' : ' lost') },
        h('div', { class: 'badge-ring' }, icon(won ? 'trophy' : 'mine')),
        h('div', { class: 'txt' }, h('strong', { text: title }), h('p', { class: 'muted', text: sub })),
        ui.button('Jeszcze raz', { variant: 'primary', onClick: function () { restart(); } })
      )
    ));
    if (K.light) K.light.collect();
  }

  function bringResult() {
    setTimeout(function () {
      if (resultEl && resultEl.isConnected) resultEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 650);
  }

  function restart(level) {
    pause();
    const lv = level || g.level;
    g = K.game.create(lv);
    if (lv !== K.store.state.settings.level) K.store.silent(function (s) { s.settings.level = lv; });
    save();
    K.refresh();
  }

  function pickLevel(lv) {
    if (lv === g.level && g.status === 'ready') return;
    if (g.status !== 'play') { restart(lv); return; }
    ui.confirm({
      title: 'Zacząć nową grę?',
      body: 'Rozpoczęta plansza przepadnie.',
      confirmLabel: 'Nowa gra'
    }).then(function (ok) { if (ok) restart(lv); });
  }

  /* ---------- dotyk ----------
     Krótkie dotknięcie robi to, co wybrano w przełączniku, a przytrzymanie —
     odwrotność. Na komputerze prawy przycisk stawia flagę. Przesunięcie palca
     to przewijanie strony, więc anuluje ruch. */

  function cellAt(target) {
    const el = target && target.closest ? target.closest('.cell') : null;
    return el && boardEl.contains(el) ? Number(el.dataset.i) : -1;
  }
  function cancelPress() {
    if (!press) return;
    clearTimeout(press.timer);
    cells[press.i].classList.remove('press');
    press = null;
  }

  function armBoard() {
    boardEl.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      const i = cellAt(e.target);
      if (i < 0) return;
      if (e.pointerType !== 'mouse') lastTouch = Date.now();
      cancelPress();
      press = { i: i, x: e.clientX, y: e.clientY, long: false };
      if (g.view[i] !== 1) cells[i].classList.add('press');
      press.timer = setTimeout(function () {
        if (!press) return;
        press.long = true;
        cells[press.i].classList.remove('press');
        if (g.view[press.i] !== 1) buzz(14);
        act(press.i, mode === 'flag' ? 'open' : 'flag');
      }, LONG_PRESS);
    });
    boardEl.addEventListener('pointermove', function (e) {
      if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) cancelPress();
    });
    boardEl.addEventListener('pointerup', function () {
      if (!press) return;
      const p = press;
      cancelPress();
      if (!p.long) act(p.i, mode);
    });
    boardEl.addEventListener('pointercancel', cancelPress);
    boardEl.addEventListener('pointerleave', cancelPress);
    boardEl.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      // na telefonie menu kontekstowe przychodzi razem z przytrzymaniem — to już obsłużone
      if (Date.now() - lastTouch < 900) return;
      const i = cellAt(e.target);
      if (i >= 0) act(i, 'flag');
    });

    // klawiatura: strzałki chodzą po polach, Enter odkrywa, F stawia flagę
    boardEl.addEventListener('click', function (e) {
      if (e.detail !== 0) return;
      const i = cellAt(e.target);
      if (i >= 0) act(i, 'open');
    });
    boardEl.addEventListener('keydown', function (e) {
      const i = cellAt(e.target);
      if (i < 0) return;
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); act(i, 'flag'); return; }
      const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -g.cols, ArrowDown: g.cols }[e.key];
      if (!step) return;
      e.preventDefault();
      const c = i % g.cols;
      if ((e.key === 'ArrowLeft' && c === 0) || (e.key === 'ArrowRight' && c === g.cols - 1)) return;
      const j = i + step;
      if (j < 0 || j >= cells.length) return;
      cells[i].tabIndex = -1;
      cells[j].tabIndex = 0;
      focusIdx = j;
      cells[j].focus();
    });
  }

  function setMode(m) {
    mode = m;
    segEl.dataset.mode = m;
    Array.prototype.forEach.call(segEl.querySelectorAll('button'), function (b) {
      const on = b.dataset.m === m;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    showHint();
  }

  function showHint() {
    if (!hintEl) return;
    hintEl.textContent = g.status === 'ready'
      ? 'Pierwsze pole zawsze jest bezpieczne.'
      : mode === 'flag' ? 'Przytrzymaj pole, żeby je odkryć.' : 'Przytrzymaj pole, żeby postawić flagę.';
  }

  /* ---------- widok ---------- */

  function render() {
    game();
    const lv = K.game.LEVELS[g.level];

    const chips = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Poziom' },
      K.game.ORDER.map(function (id) {
        return h('button', {
          class: 'chip' + (id === g.level ? ' on' : ''),
          role: 'radio',
          'aria-checked': id === g.level ? 'true' : 'false',
          onClick: function () { pickLevel(id); }
        }, K.game.LEVELS[id].label);
      })
    );

    minesEl = h('div', { class: 'readout', title: 'Miny bez flagi' }, icon('mine'), h('span'));
    clockEl = h('div', { class: 'readout right', title: 'Czas' }, icon('clock'), h('span'));
    restartEl = h('button', {
      class: 'restart', type: 'button', title: 'Nowa gra', 'aria-label': 'Nowa gra',
      onClick: function () { restart(); }
    });

    segEl = h('div', { class: 'segmented', role: 'group', 'aria-label': 'Co robi dotknięcie' },
      h('span', { class: 'knob', 'aria-hidden': 'true' }),
      h('button', { type: 'button', dataset: { m: 'open' }, onClick: function () { setMode('open'); } }, icon('dig'), 'Odkrywaj'),
      h('button', { type: 'button', dataset: { m: 'flag' }, onClick: function () { setMode('flag'); } }, icon('flag'), 'Flaguj')
    );

    boardEl = h('div', {
      class: 'board' + (g.cols > 9 ? ' dense' : ''),
      role: 'grid',
      'aria-label': 'Plansza ' + g.rows + ' na ' + g.cols + ', ' + g.mines + ' ' + ui.plural(g.mines, 'mina', 'miny', 'min')
    });
    boardEl.style.setProperty('--cols', g.cols);
    focusIdx = Math.min(focusIdx, g.view.length - 1);
    cells = g.view.map(function (_, i) {
      return h('button', { class: 'cell', type: 'button', tabindex: i === focusIdx ? '0' : '-1', dataset: { i: i } });
    });
    cells.forEach(function (c, i) { boardEl.appendChild(c); paint(i); });
    armBoard();

    resultEl = h('div', { class: 'result-slot' });
    hintEl = h('p', { class: 'tiny hint-line' });

    const out = [
      h('div', { class: 'row between' },
        chips,
        h('span', { class: 'tiny', text: lv.cols + '×' + lv.rows + ' · ' + lv.mines + ' ' + ui.plural(lv.mines, 'mina', 'miny', 'min') })
      ),
      ui.card({ class: 'tight' },
        h('div', { class: 'hud' }, minesEl, restartEl, clockEl),
        segEl
      ),
      h('div', { class: 'board-wrap' }, boardEl),
      hintEl,
      resultEl
    ];

    setMode(mode);
    updateHud();
    showResult(g.status === 'won' ? K.store.state.stats[g.level].times.findIndex(function (t) { return t.ms === g.elapsed; }) : -1);
    run();
    return out;
  }

  function destroy() {
    cancelPress();
    if (g) { pause(); save(); }
    boardEl = null;
  }

  document.addEventListener('visibilitychange', function () {
    if (!g) return;
    if (document.hidden) { pause(); save(); }
    else run();
  });

  K.views = K.views || {};
  K.views.gra = { render: render, destroy: destroy };
})(window.K = window.K || {});
