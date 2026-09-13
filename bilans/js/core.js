"use strict";
/* ============================================================
   Bilans — rdzeń: pamięć, formatowanie, szkło, arkusze.
   Wszystko liczy się na urządzeniu. Nic nie wychodzi do sieci.
   ============================================================ */

const KEY = 'bilans.v1';

/* Bilans bywa jedną z kilku apek pod wspólnym adresem. Gdy leży w
   podkatalogu /bilans/, katalog wyżej jest ich spisem — a dodany do ekranu
   głównego telefon nie daje przycisku wstecz, więc powrót musi być w apce. */
const MENU_URL = (location.protocol.indexOf('http') === 0 &&
  /\/bilans\/(index\.html)?$/.test(location.pathname)) ? '../' : null;

const TODAY = new Date();

/* ---------- skróty ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s ?? '').replace(/[&<>"']/g, m =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

/* ---------- liczby ---------- */
/* Kwoty w księgowości zawsze z groszami — inaczej zestawienie się nie spina.
   Grupowanie tysięcy robione ręcznie, bo polskie toLocaleString zostawia
   liczby czterocyfrowe bez spacji, a wtedy kolumny w zestawieniu się rozjeżdżają. */
function pln(v, dec = 2) {
  if (!isFinite(v)) v = 0;
  const [calosc, grosze] = Math.abs(round2(v)).toFixed(dec).split('.');
  return (v < -0.004 ? '\u2212' : '')
    + calosc.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
    + (grosze ? ',' + grosze : '');
}
const zl = (v, dec) => pln(v, dec) + ' zł';
const round2 = v => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
const round0 = v => Math.round(Number(v) || 0);
const pct = (v, dec = 2) => pln(v, dec).replace('−', '-') + '%';

/* Przecinek jest tym, co realnie wpisuje się z klawiatury telefonu. */
function num(s) {
  if (typeof s === 'number') return isFinite(s) ? s : 0;
  const v = parseFloat(String(s ?? '').replace(/\s| /g, '').replace(',', '.'));
  return isFinite(v) ? v : 0;
}

function plural(n, a, b, c) {
  const n10 = n % 10, n100 = n % 100;
  if (n === 1) return a;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return b;
  return c;
}

/* ---------- daty ---------- */
const MONTHS = ['styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień'];
const MONTHS_G = ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];
const DAYS = ['niedziela','poniedziałek','wtorek','środa','czwartek','piątek','sobota'];

function ymd(d) { const z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
function parseYmd(s) { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function fmtDate(s) { if (!s) return '—'; const d = parseYmd(s); return d.getDate() + ' ' + MONTHS_G[d.getMonth()] + ' ' + d.getFullYear(); }
function shortDate(s) { if (!s) return '—'; const d = parseYmd(s); const z = n => String(n).padStart(2, '0'); return z(d.getDate()) + '.' + z(d.getMonth() + 1); }
function daysBetween(a, b) { return Math.round((parseYmd(b) - parseYmd(a)) / 86400000); }
function addDays(s, n) { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

/* Wielkanoc metodą Meeusa — potrzebna do świąt ruchomych i wymiaru czasu pracy. */
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}

/* Dni ustawowo wolne od pracy w Polsce. */
function holidays(y) {
  const e = easter(y);
  const mv = n => { const d = new Date(e); d.setDate(d.getDate() + n); return d; };
  return [
    { d: new Date(y, 0, 1),  n: 'Nowy Rok' },
    { d: new Date(y, 0, 6),  n: 'Trzech Króli' },
    { d: new Date(e),        n: 'Wielkanoc' },
    { d: mv(1),              n: 'Poniedziałek Wielkanocny' },
    { d: new Date(y, 4, 1),  n: 'Święto Pracy' },
    { d: new Date(y, 4, 3),  n: 'Święto Konstytucji 3 Maja' },
    { d: mv(49),             n: 'Zielone Świątki' },
    { d: mv(60),             n: 'Boże Ciało' },
    { d: new Date(y, 7, 15), n: 'Wniebowzięcie NMP' },
    { d: new Date(y, 10, 1), n: 'Wszystkich Świętych' },
    { d: new Date(y, 10, 11),n: 'Święto Niepodległości' },
    { d: new Date(y, 11, 25),n: 'Boże Narodzenie' },
    { d: new Date(y, 11, 26),n: 'drugi dzień Bożego Narodzenia' }
  ];
}
const holidaySet = y => new Set(holidays(y).map(h => ymd(h.d)));
const _holCache = {};
function isHoliday(s) {
  const y = parseYmd(s).getFullYear();
  if (!_holCache[y]) _holCache[y] = holidaySet(y);
  return _holCache[y].has(s);
}
function isWorkday(s) {
  const d = parseYmd(s).getDay();
  return d !== 0 && d !== 6 && !isHoliday(s);
}
/* Termin, który wypada w sobotę, niedzielę lub święto, przechodzi na
   najbliższy dzień roboczy (art. 12 § 5 Ordynacji podatkowej). */
function nextWorkday(s) { let d = s; while (!isWorkday(d)) d = addDays(d, 1); return d; }
function workdaysBetween(a, b) { let n = 0, d = a; while (d <= b) { if (isWorkday(d)) n++; d = addDays(d, 1); } return n; }

/* ---------- pamięć ---------- */
let S = null;

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Nie udało się zapisać danych'); }
}
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); }
  catch (e) {}
  return null;
}
function freshData() {
  return {
    version: 1,
    year: String(TODAY.getFullYear()),
    params: {},          // nadpisania parametrów: { '2026': { minWage: 4806, ... } }
    plan: { over: {}, add: [], hide: [] },   // poprawki użytkownika w planie kont
    calc: {},            // zapamiętane pola formularzy per narzędzie
    tasks: [],           // zadania księgowe
    currentTask: null,
    pinned: [],          // przypięte narzędzia
    seen: false
  };
}

/* ---------- powiadomienie ---------- */
function toast(msg) {
  const el = $('#tip');
  el.innerHTML = esc(msg);
  el.classList.add('on');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('on'), 2100);
}

async function copyText(txt, msg) {
  try {
    await navigator.clipboard.writeText(txt);
    toast(msg || 'Skopiowano');
  } catch (e) {
    /* Bez HTTPS schowek bywa zamknięty — wtedy pokaż tekst do zaznaczenia. */
    openSheet(`<h3>Skopiuj ręcznie</h3><div class="sub">Przeglądarka nie dała dostępu do schowka.</div>
      <div class="field"><textarea rows="10" readonly class="mono-ta">${esc(txt)}</textarea></div>
      <button class="btn wide ghost" data-act="close">Zamknij</button>`);
  }
}

/* ---------- arkusze ---------- */
let sheetOpen = false, lastFocus = null;

function openSheet(html) {
  $('#sheet').innerHTML = '<div class="grabber"></div>' + html;
  $('#scrim').classList.add('on');
  $('#sheet').classList.add('on');
  $('#sheet').scrollTop = 0;
  sheetOpen = true;
  lastFocus = document.activeElement;
  document.body.style.overflow = 'hidden';
  document.body.classList.add('sheet-open');
  requestAnimationFrame(collectGlass);
  const f = $('#sheet input:not([readonly]),#sheet select,#sheet textarea:not([readonly])');
  if (f) setTimeout(() => f.focus({ preventScroll: true }), 320);
}
function closeSheet() {
  $('#scrim').classList.remove('on');
  $('#sheet').classList.remove('on');
  sheetOpen = false;
  document.body.style.overflow = '';
  document.body.classList.remove('sheet-open', 'sheet-drag');
  document.body.style.removeProperty('--sheet-k');
  setTimeout(collectGlass, 420);
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}

/* ---------- klocki interfejsu ---------- */
const icon = (body, cls = 'ci', w = 1.7) =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/* Pole formularza. Wartości trzymają się w S.calc[narzędzie][name],
   więc wracając do kalkulatora widzisz to, co ostatnio liczyłeś. */
function field(name, label, opts = {}) {
  const v = opts.value ?? '';
  const hint = opts.hint ? `<span class="fhint">${esc(opts.hint)}</span>` : '';
  const suf = opts.suffix ? `<span class="suffix">${esc(opts.suffix)}</span>` : '';
  const attrs = [
    `id="f-${name}"`, `data-f="${name}"`,
    `type="${opts.type || 'text'}"`,
    opts.type === 'text' || !opts.type ? 'inputmode="decimal"' : '',
    `value="${esc(v)}"`,
    opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : '',
    opts.min !== undefined ? `min="${opts.min}"` : '',
    opts.max !== undefined ? `max="${opts.max}"` : '',
    'autocomplete="off"'
  ].filter(Boolean).join(' ');
  return `<div class="field${opts.wide ? ' wide' : ''}">
    <label for="f-${name}">${esc(label)}${hint}</label>
    <div class="inwrap">${suf}<input ${attrs} class="${suf ? 'has-suffix' : ''}"></div>
  </div>`;
}

function select(name, label, options, value, opts = {}) {
  const hint = opts.hint ? `<span class="fhint">${esc(opts.hint)}</span>` : '';
  return `<div class="field">
    <label for="f-${name}">${esc(label)}${hint}</label>
    <select id="f-${name}" data-f="${name}">${options.map(o => {
      const val = o.v ?? o.value ?? o;
      const lab = o.l ?? o.label ?? o;
      return `<option value="${esc(val)}" ${String(val) === String(value) ? 'selected' : ''}>${esc(lab)}</option>`;
    }).join('')}</select>
  </div>`;
}

function seg(name, options, value) {
  return `<div class="seg" data-seg="${name}">${options.map(o => {
    const val = o.v ?? o;
    const lab = o.l ?? o;
    return `<button type="button" data-f="${name}" data-v="${esc(val)}" aria-pressed="${String(val) === String(value)}">${esc(lab)}</button>`;
  }).join('')}</div>`;
}

function toggle(name, title, desc, on) {
  return `<button type="button" class="switch" data-f="${name}" data-toggle aria-pressed="${on ? 'true' : 'false'}">
    <span class="lab"><span class="t">${esc(title)}</span>${desc ? `<span class="d">${esc(desc)}</span>` : ''}</span>
    <span class="track-sw"><i></i></span>
  </button>`;
}

/* Wynik: duża liczba, pod nią rozbicie krok po kroku.
   Dla ucznia rozbicie jest ważniejsze niż sam wynik — stąd wzór przy każdej pozycji. */
function result(title, value, sub, tone) {
  return `<div class="bigout glass pane${tone ? ' ' + tone : ''}">
    <div class="k">${esc(title)}</div>
    <div class="v num">${esc(value)}</div>
    ${sub ? `<div class="s">${sub}</div>` : ''}
  </div>`;
}

/* [{k:'nazwa', f:'wzór', v:'kwota', tone:'minus|plus|sum'}] */
function steps(rows, title) {
  return `<div class="glass pane steps">
    ${title ? `<div class="eyebrow" style="margin-bottom:10px">${esc(title)}</div>` : ''}
    ${rows.filter(Boolean).map(r => `<div class="step${r.tone ? ' ' + r.tone : ''}">
      <div class="sk">${esc(r.k)}${r.f ? `<span class="sf">${esc(r.f)}</span>` : ''}</div>
      <div class="sv num">${r.v}</div>
    </div>`).join('')}
  </div>`;
}

const note = (t, cls = '') => `<div class="note ${cls}">${t}</div>`;
const banner = (t, cls = 'tip') => `<div class="banner ${cls}">${t}</div>`;
const secHead = (t, hint) => `<div class="sec-head"><h2>${esc(t)}</h2>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`;

/* ---------- odczyt formularza ---------- */
function readForm(root) {
  const r = root || document;
  const out = {};
  $$('[data-f]', r).forEach(el => {
    const n = el.dataset.f;
    if (el.tagName === 'BUTTON') {
      if (el.hasAttribute('data-toggle')) out[n] = el.getAttribute('aria-pressed') === 'true';
      else if (el.getAttribute('aria-pressed') === 'true') out[n] = el.dataset.v;
    } else {
      out[n] = el.value;
    }
  });
  return out;
}

/* ---------- światło na szkle ---------- */
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let glassEls = [], lightX = .5, lightY = .12, tgX = .5, tgY = .12, rafLight = 0;

function collectGlass() { glassEls = $$('.glass, #sheet.on'); paintGlass(); }
function paintGlass() {
  const w = innerWidth, h = innerHeight;
  const lx = lightX * w, ly = lightY * h;
  glassEls.forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.bottom < -200 || r.top > h + 200) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const ang = Math.atan2(cy - ly, cx - lx) * 180 / Math.PI + 90;
    const dist = Math.hypot(cx - lx, cy - ly) / Math.hypot(w, h);
    el.style.setProperty('--gang', ang.toFixed(1) + 'deg');
    el.style.setProperty('--gi', clamp(1 - dist * 1.15, .18, 1).toFixed(3));
    el.style.setProperty('--gx', clamp((lx - r.left) / r.width * 100, -30, 130).toFixed(1) + '%');
    el.style.setProperty('--gy', clamp((ly - r.top) / r.height * 100, -60, 160).toFixed(1) + '%');
  });
}
function tickLight() {
  lightX += (tgX - lightX) * .09;
  lightY += (tgY - lightY) * .09;
  paintGlass();
  rafLight = (Math.abs(tgX - lightX) > .001 || Math.abs(tgY - lightY) > .001) ? requestAnimationFrame(tickLight) : 0;
}
function aimLight(x, y) {
  tgX = clamp(x, -.2, 1.2); tgY = clamp(y, -.3, 1.3);
  if (!rafLight && !REDUCED) rafLight = requestAnimationFrame(tickLight);
}

/* ---------- akcje ---------- */
/* Każdy moduł dopisuje tu swoje reakcje na dotknięcie [data-act]. */
const ACT = {};

/* ---------- liczby przeliczają się płynnie, zamiast przeskakiwać ---------- */
const countMem = {};
function animateCounts() {
  if (REDUCED) return;
  $$('#view .bigout').forEach(box => {
    const kEl = $('.k', box), vEl = $('.v', box);
    if (!kEl || !vEl) return;
    const key = kEl.textContent.trim();
    /* Wynik bywa też słowem („Skala podatkowa") — wtedy nie ma czego liczyć. */
    const m = vEl.textContent.match(/^(−|-)?([\d  ]+(?:,\d+)?)(.*)$/);
    if (!m) { delete countMem[key]; return; }
    const znak = m[1] ? -1 : 1;
    const to = znak * parseFloat(m[2].replace(/[\s ]/g, '').replace(',', '.'));
    const dec = (m[2].split(',')[1] || '').length;
    const suf = m[3];
    const from = countMem[key] !== undefined ? countMem[key] : 0;
    countMem[key] = to;
    if (!isFinite(to) || Math.abs(to - from) < .5) return;
    const t0 = performance.now();
    (function krok(now) {
      const k = clamp((now - t0) / 560, 0, 1), e = 1 - Math.pow(1 - k, 3);
      vEl.textContent = pln(from + (to - from) * e, dec) + suf;
      if (k < 1) requestAnimationFrame(krok);
      else vEl.textContent = pln(to, dec) + suf;
    })(t0);
  });
}
