"use strict";
/* ============================================================
   Bilans — szkielet: zakładki, narzędzia, parametry roku.
   ============================================================ */

const TABORDER = ['ksiegi', 'place', 'kadry', 'firma', 'narzedzia'];
const TABNAZWY = { ksiegi: 'Księgi', place: 'Płace', kadry: 'Kadry', firma: 'Firma', narzedzia: 'Narzędzia' };
let tab = 'ksiegi';
let lastTab = 'ksiegi';
let tool = null;

/* ---------- widoki zakładek z narzędziami ---------- */
function viewTools(tabId) {
  const list = TOOLS[tabId] || [];
  return `<div class="tools">${list.map(t => `
    <button class="tool" data-act="open-tool" data-id="${t.id}">
      ${icon(t.i, 'ti')}
      <span class="tn">${esc(t.n)}</span>
      <span class="td">${esc(t.d)}</span>
    </button>`).join('')}</div>
    ${tabId === 'place' ? note('Wszystkie kwoty liczone według parametrów na rok ' + S.year + '. Zmienisz je stuknięciem w rok na górze ekranu.') : ''}`;
}

function viewTool(t) {
  const v = toolVals(t);
  return `
    <div class="glass pane" id="form">${t.form(v)}</div>
    <div id="out">${t.out(v)}</div>`;
}

/* Wynik przelicza się przy każdym dotknięciu pola. */
function refreshOut() {
  if (!tool) return;
  const t = ALL_TOOLS[tool];
  const v = Object.assign(toolVals(t), readForm($('#view')));
  if (t.sync) t.sync(v);
  saveVals(t, v);
  const out = $('#out');
  if (out) out.innerHTML = t.out(v);
  collectGlass();
}
/* Zmiana, która przestawia sam formularz (np. inny kierunek liczenia). */
function refreshTool() {
  if (!tool) return;
  const t = ALL_TOOLS[tool];
  const v = Object.assign(toolVals(t), readForm($('#view')));
  if (t.sync) t.sync(v);
  saveVals(t, v);
  $('#view').innerHTML = viewTool(t);
  collectGlass();
  animateCounts();
}

/* ---------- rysowanie ---------- */
function render() {
  const dir = TABORDER.indexOf(tab) > TABORDER.indexOf(lastTab) ? 1
    : TABORDER.indexOf(tab) < TABORDER.indexOf(lastTab) ? -1 : 0;
  lastTab = tab;

  const t = tool ? ALL_TOOLS[tool] : null;
  $('#btn-back').hidden = !tool;
  $('#btn-menu').hidden = !!tool || !MENU_URL;
  $('#title').textContent = t ? t.n : 'Bilans';
  $('#yearchip').textContent = S.year;

  $('#view').innerHTML = t ? viewTool(t) : (tab === 'ksiegi' ? viewKsiegi() : viewTools(tab));
  $$('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
  syncPill();
  window.scrollTo({ top: 0, behavior: 'instant' });

  const v = $('#view');
  v.style.setProperty('--dir', dir);
  v.classList.remove('in'); void v.offsetWidth; v.classList.add('in');
  collectGlass();
  animateCounts();
}

/* ---------- akcje wspólne ---------- */
/* Zakładkę wybiera się dotknięciem, przeciągnięciem palca po pasku
   albo klawiaturą — ta akcja obsługuje to ostatnie. */
ACT['tab'] = b => {
  if (b.dataset.tab === tab && !tool) return;
  tab = b.dataset.tab; tool = null; render();
};
ACT['open-tool'] = b => { tool = b.dataset.id; render(); };
ACT['back'] = () => { tool = null; render(); };
ACT['close'] = () => closeSheet();
ACT['year'] = () => {
  const i = YEARS.indexOf(S.year);
  S.year = YEARS[(i + 1) % YEARS.length];
  save(); render();
  toast('Parametry na rok ' + S.year);
};
ACT['params'] = () => sheetParams();
ACT['settings'] = () => sheetSettings();

ACT['copy-out'] = () => {
  const out = $('#out');
  if (!out) return;
  const txt = [];
  $$('.bigout', out).forEach(b => txt.push($('.k', b).textContent + ': ' + $('.v', b).textContent));
  $$('.steps', out).forEach(s => {
    const tytul = $('.eyebrow', s);
    if (tytul) txt.push('', tytul.textContent.toUpperCase());
    $$('.step', s).forEach(r => {
      const k = $('.sk', r).childNodes[0].textContent.trim();
      txt.push('  ' + k.padEnd(38) + $('.sv', r).textContent.trim());
    });
  });
  txt.push('', 'Policzone w apce Bilans na parametrach roku ' + S.year + '.');
  copyText(txt.join('\n'), 'Rozbicie skopiowane');
};

/* Lista płac prosto na konta — most między kalkulatorem a księgami. */
ACT['ksieguj-place'] = () => {
  const r = lastUoP;
  if (!r) return;
  const t = curTask() || newTask('Lista płac ' + fmtDate(ymd(TODAY)));
  const dodaj = (dowod, tresc, kwota, wn, ma) => {
    if (!(kwota > 0)) return;
    t.ops.push({ id: uid(), dowod, tresc, lines: [{ k: wn, s: 'wn', kwota: round2(kwota) }, { k: ma, s: 'ma', kwota: round2(kwota) }] });
  };
  dodaj('LP', 'Wynagrodzenie brutto', r.brutto, '404', '230');
  dodaj('LP', 'Potrącenie składek społecznych pracownika', r.spoleczne, '230', '223');
  dodaj('LP', 'Potrącenie składki zdrowotnej', r.zdrowotna, '230', '223');
  dodaj('LP', 'Potrącenie zaliczki na podatek', r.zaliczka, '230', '222');
  dodaj('PK', 'Składki ZUS obciążające pracodawcę', r.skladkiF, '405', '223');
  dodaj('WB', 'Wypłata wynagrodzenia netto', r.netto, '230', '131');
  save();
  tool = null; tab = 'ksiegi'; kSub = 'dziennik';
  render();
  toast('Lista płac zaksięgowana w „' + t.name + '"');
};

/* ---------- rozchód materiałów ---------- */
ACT['add-ruch'] = () => {
  const t = ALL_TOOLS[tool];
  const v = Object.assign(toolVals(t), readForm($('#view')));
  if (t.sync) t.sync(v);
  v.ruchy = (v.ruchy || []).concat([{ typ: 'pz', ilosc: '', cena: '' }]);
  saveVals(t, v); refreshTool();
};
ACT['del-ruch'] = b => {
  const t = ALL_TOOLS[tool];
  const v = Object.assign(toolVals(t), readForm($('#view')));
  if (t.sync) t.sync(v);
  v.ruchy.splice(+b.dataset.i, 1);
  saveVals(t, v); refreshTool();
};
ACT['ruch-typ'] = b => {
  const t = ALL_TOOLS[tool];
  const v = Object.assign(toolVals(t), readForm($('#view')));
  if (t.sync) t.sync(v);
  const r = v.ruchy[+b.dataset.i];
  r.typ = r.typ === 'pz' ? 'rw' : 'pz';
  saveVals(t, v); refreshTool();
};

/* ============================================================
   PARAMETRY ROKU
   ============================================================ */
function sheetParams() {
  openSheet(`<h3>Parametry roku ${S.year}</h3>
    <div class="sub">Każdą liczbę możesz poprawić — zadanie na lekcji bywa liczone na stawkach z polecenia.
      Kropka oznacza wartość, którą warto sprawdzić przed oddaniem wyliczenia.</div>
    ${seg('rok', YEARS.map(y => ({ v: y, l: y })), S.year)}
    ${PARAMS.map(g => `
      <div class="eyebrow" style="margin:16px 0 4px">${esc(g.g)}</div>
      <div class="glass pane" style="padding:4px 13px">
        ${g.items.map(p => `<div class="prow${isEdited(p.k) ? ' edited' : ''}">
          <span class="pn">${p.check ? '<span class="dot"></span>' : ''}${esc(p.n)}
            ${p.h ? `<span class="ph">${esc(p.h)}</span>` : ''}</span>
          <span class="pv"><input data-param="${p.k}" inputmode="decimal"
            value="${isEdited(p.k) ? esc(String(P(p.k)).replace('.', ',')) : ''}"
            placeholder="${esc(String(PARAM_BY_KEY[p.k].d[S.year] ?? '').replace('.', ','))}"></span>
          <span class="pu">${esc(p.u || '')}</span>
        </div>`).join('')}
      </div>`).join('')}
    <div class="eyebrow" style="margin:16px 0 6px">Wyliczone z parametrów</div>
    <div class="glass pane">
      <div class="kv"><span class="k">Podstawa ZUS — pełne składki</span><span class="v">${pln(zusBaseFull())} zł</span></div>
      <div class="kv"><span class="k">Podstawa ZUS — preferencyjne</span><span class="v">${pln(zusBasePref())} zł</span></div>
      <div class="kv"><span class="k">Minimalna składka zdrowotna</span><span class="v">${pln(zdrowMin())} zł</span></div>
      <div class="kv"><span class="k">Odsetki podatkowe</span><span class="v">${pln(odsPodatkowe())}%</span></div>
      <div class="kv"><span class="k">Odsetki ustawowe za opóźnienie</span><span class="v">${pln(odsOpoznienie())}%</span></div>
      <div class="kv"><span class="k">Odsetki ustawowe kapitałowe</span><span class="v">${pln(odsUstawowe())}%</span></div>
    </div>
    ${paramCount() ? `<button class="btn wide ghost sm" data-act="reset-params" style="margin-top:12px">
      Przywróć domyślne dla ${S.year} (zmienionych: ${paramCount()})</button>` : ''}
    <button class="btn wide ghost" data-act="close" style="margin-top:10px">Gotowe</button>`);
}
ACT['reset-params'] = () => { resetParams(); sheetParams(); render(); toast('Przywrócone'); };

/* ============================================================
   USTAWIENIA
   ============================================================ */
function sheetSettings() {
  openSheet(`<h3>Ustawienia</h3>
    <div class="sub">Wszystko liczy się i zapisuje na tym urządzeniu. Nic nie wychodzi do sieci.</div>
    <button class="btn wide ghost" data-act="params" style="justify-content:space-between">
      <span>Parametry roku ${S.year}</span><span class="muted tiny">${paramCount() ? paramCount() + ' zmienionych' : 'domyślne'}</span></button>
    <button class="btn wide ghost" data-act="plan-kont" style="justify-content:space-between;margin-top:8px">
      <span>Plan kont</span><span class="muted tiny">${planList().length} kont${planCount() ? ' · ' + planCount() + ' zmian' : ''}</span></button>
    <button class="btn wide ghost" data-act="schematy" style="justify-content:space-between;margin-top:8px">
      <span>Schematy księgowań</span><span class="muted tiny">${SCHEMATY.reduce((s, g) => s + g.ops.length, 0)} operacji</span></button>

    <div class="eyebrow" style="margin:18px 0 8px">Kopia danych</div>
    <div class="btnrow">
      <button class="btn ghost sm" data-act="export">Pokaż kopię</button>
      <button class="btn ghost sm" data-act="import">Wczytaj kopię</button>
    </div>
    <div class="note" style="margin-top:8px">Kopia to zwykły tekst. Po wyczyszczeniu danych przeglądarki to jedyny sposób, żeby odzyskać zadania i parametry.</div>

    <div class="eyebrow" style="margin:18px 0 8px">O aplikacji</div>
    <div class="note">Bilans liczy według przepisów, które obowiązują w Polsce, ale przepisy się zmieniają —
      przed oddaniem pracy sprawdź parametry oznaczone kropką. Apka jest pomocą w liczeniu, nie poradą podatkową.</div>

    <div class="btnrow" style="margin-top:18px">
      <button class="btn ghost" data-act="close">Zamknij</button>
      <button class="btn danger" data-act="wipe">Wyczyść wszystko</button>
    </div>`);
}

ACT['export'] = () => {
  const txt = JSON.stringify(S);
  openSheet(`<h3>Kopia danych</h3><div class="sub">Zaznacz, skopiuj i zachowaj.</div>
    <div class="field"><textarea rows="8" readonly class="mono-ta" id="exp">${esc(txt)}</textarea></div>
    <div class="btnrow"><button class="btn ghost" data-act="close">Zamknij</button>
      <button class="btn primary" data-act="copy-export">Kopiuj</button></div>`);
};
ACT['copy-export'] = () => copyText(JSON.stringify(S), 'Kopia skopiowana');
ACT['import'] = () => {
  openSheet(`<h3>Wczytaj kopię</h3><div class="sub">Obecne dane zostaną zastąpione.</div>
    <div class="field"><textarea rows="8" class="mono-ta" id="imp" placeholder='{"version":1,...}'></textarea></div>
    <div class="btnrow"><button class="btn ghost" data-act="close">Anuluj</button>
      <button class="btn primary" data-act="do-import">Wczytaj</button></div>`);
};
ACT['do-import'] = () => {
  try {
    const d = JSON.parse($('#imp').value);
    if (!d || typeof d !== 'object') throw 0;
    S = Object.assign(freshData(), d);
    save(); closeSheet(); render(); toast('Wczytano kopię');
  } catch (e) { toast('To nie wygląda na kopię danych'); }
};
ACT['wipe'] = () => {
  if (!confirm('Usunąć wszystkie zadania, wyliczenia i zmienione parametry? Tego nie da się cofnąć.')) return;
  S = freshData(); save(); closeSheet(); tool = null; render();
  toast('Czysto — zaczynamy od zera');
};

/* ============================================================
   ZDARZENIA
   ============================================================ */
let suppressClick = false;
document.addEventListener('click', e => {
  if (suppressClick) return;
  const act = e.target.closest('[data-act]');
  if (act) {
    e.preventDefault();
    const fn = ACT[act.dataset.act];
    if (fn) fn(act);
    return;
  }
  /* przełącznik */
  const sw = e.target.closest('[data-toggle]');
  if (sw) {
    const on = sw.getAttribute('aria-pressed') !== 'true';
    sw.setAttribute('aria-pressed', on);
    const wSheet = !!sw.closest('#sheet');
    if (wSheet) { if (!opToggle(sw.dataset.f)) { /* inne przełączniki same się zapiszą */ } }
    else refreshTool();
    return;
  }
  /* segment */
  const sg = e.target.closest('.seg button[data-f]');
  if (sg) {
    const box = sg.closest('.seg');
    $$('button', box).forEach(b => b.setAttribute('aria-pressed', b === sg));
    if (box.dataset.seg === 'rok') { S.year = sg.dataset.v; save(); sheetParams(); render(); return; }
    if (!sg.closest('#sheet')) refreshTool();
    return;
  }
  /* tło arkusza */
  if (e.target.id === 'scrim') closeSheet();
});

document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.param !== undefined) { setParam(el.dataset.param, el.value); return; }
  if (el.dataset.lq !== undefined) { odswiezListe(el); return; }
  if (el.closest('#sheet')) return;
  if (el.dataset.f !== undefined) refreshOut();
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.tagName === 'SELECT' && !el.closest('#sheet') && el.dataset.f !== undefined) refreshTool();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheetOpen) closeSheet(); });

/* ---------- pasek zakładek: szklany bąbelek, który da się przeciągać ----------
   Dotknięcie gdziekolwiek na pasku przyciąga bąbelek pod palec; przeciągnięcie
   przesuwa go płynnie i rozciąga przy szybkim ruchu, a puszczenie przełącza
   sekcję. Zwykłe dotknięcie wciąż działa jak klik. */
const tabsEl = $('#tabs'), pill = $('#tabpill');
const tabBtns = () => $$('#tabs button[data-tab]');
const idxOfTab = n => tabBtns().findIndex(b => b.dataset.tab === n);
let dragging = false, dragMoved = false, hoverIdx = 0, downX = 0, lastX = 0, lastT = 0, vel = 0;

function placePill({ idx = hoverIdx, x = null, stretch = 1 } = {}) {
  const btns = tabBtns(), b = btns[clamp(idx, 0, btns.length - 1)];
  if (!b || !b.offsetWidth) return;
  pill.style.width = b.offsetWidth + 'px';
  pill.style.transform = `translate3d(${Math.round((x === null ? b.offsetLeft : x) * 10) / 10}px,0,0) scaleX(${stretch})`;
}
function highlight(i) { tabBtns().forEach((b, j) => b.classList.toggle('hot', j === i)); }
function syncPill() { hoverIdx = Math.max(0, idxOfTab(tab)); placePill({ idx: hoverIdx }); highlight(hoverIdx); }

/* najbliższy środek — odporne na szczeliny między przyciskami i na krawędzie */
function idxAt(clientX) {
  const btns = tabBtns();
  let best = 0, bestD = Infinity;
  btns.forEach((b, i) => {
    const r = b.getBoundingClientRect(), d = Math.abs(clientX - (r.left + r.width / 2));
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}
function xAt(clientX) {
  const btns = tabBtns(), navX = tabsEl.getBoundingClientRect().left;
  const first = btns[0].offsetLeft, last = btns[btns.length - 1].offsetLeft;
  let x = clientX - navX - btns[0].offsetWidth / 2;
  if (x < first) x = first - (first - x) / 2.8;     // opór na krawędziach
  if (x > last) x = last + (x - last) / 2.8;
  return x;
}

tabsEl.addEventListener('pointerdown', e => {
  if (e.button && e.button !== 0) return;
  const btns = tabBtns();
  if (!btns.length || !btns[0].offsetWidth) return;
  dragging = true; dragMoved = false;
  downX = lastX = e.clientX; lastT = performance.now(); vel = 0;
  try { tabsEl.setPointerCapture(e.pointerId); } catch (err) {}
  pill.classList.remove('free');
  hoverIdx = idxAt(e.clientX);
  placePill({ idx: hoverIdx });
  highlight(hoverIdx);
});
tabsEl.addEventListener('pointermove', e => {
  if (!dragging) return;
  const now = performance.now(), dt = Math.max(1, now - lastT);
  vel = (e.clientX - lastX) / dt * 1000; lastX = e.clientX; lastT = now;
  if (!dragMoved && Math.abs(e.clientX - downX) < 5) return;
  dragMoved = true;
  pill.classList.add('free');
  placePill({ idx: hoverIdx, x: xAt(e.clientX), stretch: clamp(1 + Math.abs(vel) / 4500, 1, 1.14) });
  const i = idxAt(e.clientX);
  if (i !== hoverIdx) {
    hoverIdx = i;
    highlight(i);
    try { navigator.vibrate && navigator.vibrate(5); } catch (err) {}
  }
});
function endDrag() {
  if (!dragging) return;
  dragging = false;
  pill.classList.remove('free');
  placePill({ idx: hoverIdx });
  const name = (tabBtns()[hoverIdx] || {}).dataset?.tab;
  if (dragMoved) { suppressClick = true; setTimeout(() => suppressClick = false, 120); }
  if (name && name !== tab) { tab = name; tool = null; render(); }
  else highlight(idxOfTab(tab));
}
tabsEl.addEventListener('pointerup', endDrag);
tabsEl.addEventListener('pointercancel', () => { dragging = false; pill.classList.remove('free'); syncPill(); });
tabsEl.addEventListener('keydown', e => {
  const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
  if (!dir) return;
  e.preventDefault();
  const btns = tabBtns(), i = clamp(idxOfTab(tab) + dir, 0, btns.length - 1);
  tab = btns[i].dataset.tab; tool = null; render(); btns[i].focus();
});

/* ---------- arkusz: przeciągnięcie w dół zamyka ---------- */
(function sheetDrag() {
  const sheet = $('#sheet');
  let y0 = 0, dy = 0, armed = false, active = false;
  sheet.addEventListener('pointerdown', e => {
    if (!sheetOpen || e.pointerType === 'mouse') return;
    if (sheet.scrollTop > 0) return;
    if (e.target.closest('input,select,textarea,.acclist')) return;
    y0 = e.clientY; dy = 0; armed = true; active = false;
  });
  sheet.addEventListener('pointermove', e => {
    if (!armed) return;
    dy = e.clientY - y0;
    if (!active && dy > 8) { active = true; document.body.classList.add('sheet-drag'); }
    if (!active) return;
    const v = Math.max(0, dy);
    sheet.style.transform = `translate(-50%, ${v}px)`;
    document.body.style.setProperty('--sheet-k', String(clamp(1 - v / 320, 0, 1)));
    $('#scrim').style.opacity = String(clamp(1 - v / 420, 0, 1));
  });
  const koniec = () => {
    if (!armed) return;
    armed = false;
    document.body.classList.remove('sheet-drag');
    sheet.style.transform = '';
    $('#scrim').style.opacity = '';
    document.body.style.removeProperty('--sheet-k');
    if (active && dy > 110) closeSheet();
    active = false;
  };
  sheet.addEventListener('pointerup', koniec);
  sheet.addEventListener('pointercancel', koniec);
})();

/* ---------- światło ---------- */
addEventListener('scroll', () => { paintGlass(); }, { passive: true });
addEventListener('resize', () => { collectGlass(); syncPill(); }, { passive: true });
addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') aimLight(e.clientX / innerWidth, e.clientY / innerHeight * .8);
}, { passive: true });
addEventListener('touchmove', e => {
  const t = e.touches[0];
  if (t) aimLight(t.clientX / innerWidth, t.clientY / innerHeight * .7);
}, { passive: true });
if (window.DeviceOrientationEvent && !REDUCED) {
  addEventListener('deviceorientation', e => {
    if (e.gamma === null) return;
    aimLight(.5 + clamp(e.gamma / 60, -1, 1) * .55, .2 + clamp((e.beta - 45) / 60, -1, 1) * .4);
  }, { passive: true });
}
/* powolny dryf, żeby tafla nigdy nie stała w miejscu */
let driftT = 0;
setInterval(() => {
  if (document.hidden || REDUCED || dragging) return;
  driftT += 1;
  aimLight(.5 + Math.sin(driftT / 9) * .28, .12 + Math.cos(driftT / 13) * .1);
}, 2400);

/* ---------- start ---------- */
function boot() {
  S = load() || freshData();
  if (!S.params) S.params = {};
  if (!S.calc) S.calc = {};
  if (!S.tasks) S.tasks = [];
  planUser();
  if (YEARS.indexOf(S.year) < 0) S.year = YEARS[0];
  if (MENU_URL) $('#btn-menu').href = MENU_URL;
  render();
  requestAnimationFrame(() => { syncPill(); collectGlass(); });
  setTimeout(collectGlass, 400);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { syncPill(); collectGlass(); });
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
boot();
