"use strict";
/* ============================================================
   Księgi — widoki. Zadanie prowadzi się tu tak samo jak w zeszycie:
   otwierasz konta, księgujesz operacje, ustalasz obroty i salda,
   a na końcu układasz bilans i rachunek zysków i strat.
   ============================================================ */

const K_SUBS = [
  { k: 'dziennik', n: 'Dziennik' },
  { k: 'konta',    n: 'Konta' },
  { k: 'zois',     n: 'Obroty i salda' },
  { k: 'bilans',   n: 'Bilans' },
  { k: 'rzis',     n: 'Wynik' }
];

let opDraft = null;
let boDraft = { k: '', wn: '', ma: '' };
let pickTarget = null;

/* ---------- widok główny ---------- */
function viewKsiegi() {
  const t = curTask();
  if (!t) return viewBrakZadania();
  const c = calcTask(t);
  /* Pięć podstron nie mieści się w rzędzie na telefonie — stąd pasek do przewinięcia. */
  const sub = `<div class="subnav">${K_SUBS.map(s =>
    `<button type="button" data-act="ksub" data-v="${s.k}" aria-pressed="${kSub === s.k}">${s.n}</button>`).join('')}</div>`;

  const body = kSub === 'konta'  ? kKonta(t, c)
    : kSub === 'zois'   ? kZois(t, c)
    : kSub === 'bilans' ? kBilans(t, c)
    : kSub === 'rzis'   ? kRzis(t, c)
    : kDziennik(t, c);

  return `
    <button class="op" data-act="tasks" style="align-items:center">
      <span class="body">
        <span class="t">${esc(t.name)}</span>
        <span class="d">${t.ops.length} ${plural(t.ops.length, 'operacja', 'operacje', 'operacji')}
          · ${t.bo.length ? 'bilans otwarcia na ' + pln(c.sums.boWn) + ' zł' : 'bez bilansu otwarcia'}</span>
      </span>
      ${icon('<path d="m6 9 6 6 6-6"/>', 'ci')}
    </button>
    ${sub}
    ${kUwagi(c)}
    ${body}`;
}

function viewBrakZadania() {
  return `
    <div class="glass pane" style="border-radius:var(--r-xl);padding:22px 18px">
      <h2 style="font-size:19px">Zadanie na kontach</h2>
      <p class="note" style="margin:10px 0 0;padding:0">
        Wpisz bilans otwarcia i operacje gospodarcze, a Bilans sam policzy obroty, salda,
        zestawienie obrotów i sald, bilans zamknięcia i wynik finansowy. Po każdej operacji
        sprawdza, czy strona Wn równa się stronie Ma.
      </p>
      <div class="btnrow" style="margin-top:16px">
        <button class="btn primary" data-act="new-task">Nowe zadanie</button>
      </div>
    </div>
    <div class="tools">
      <button class="tool" data-act="plan-kont">${icon('<path d="M4 6h16M4 12h16M4 18h10"/>', 'ti')}
        <span class="tn">Plan kont</span><span class="td">Numery, nazwy i typy kont — z wyszukiwarką</span></button>
      <button class="tool" data-act="schematy">${icon('<path d="M12 4v16M4 8h6M14 16h6"/>', 'ti')}
        <span class="tn">Jak zaksięgować</span><span class="td">Gotowe dekretacje typowych operacji</span></button>
    </div>`;
}

/* ---------- kontrola ---------- */
function kUwagi(c) {
  if (!c.uwagi.length) {
    if (!c.ops.length) return '';
    return banner(`${icon('<path d="M20 6 9 17l-5-5"/>')}<span>Wszystko się spina: obroty Wn = obroty Ma = ${esc(pln(c.sums.obWn))} zł</span>`, 'ok');
  }
  const bad = c.uwagi.filter(u => u.t === 'bad');
  const warn = c.uwagi.filter(u => u.t === 'warn');
  return [
    bad.length ? banner(`${icon('<path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/>')}
      <span>${bad.map(u => esc(u.m)).join('<br>')}</span>`, 'alert') : '',
    warn.length ? banner(`${icon('<path d="M12 9v4M12 16.5v.5M10.3 4.3 2.8 17.5A1.4 1.4 0 0 0 4 19.6h16a1.4 1.4 0 0 0 1.2-2.1L13.7 4.3a1.6 1.6 0 0 0-2.8 0Z"/>')}
      <span>${warn.map(u => esc(u.m)).join('<br>')}</span>`, 'warn') : ''
  ].join('');
}

/* ---------- dziennik ---------- */
function kDziennik(t, c) {
  const bo = t.bo.length ? `
    <div class="glass pane">
      <div class="kv" style="padding-top:0"><span class="k">Bilans otwarcia</span>
        <span class="v"><button class="linkish" data-act="bo">zmień</button></span></div>
      ${t.bo.map(b => `<div class="kv">
        <span class="k"><b style="color:var(--text)">${esc(b.konto)}</b> ${esc(accInfo(b.konto, t).n)}</span>
        <span class="v ${num(b.wn) ? 'wn' : 'ma'}" style="color:${num(b.wn) ? 'var(--wn)' : 'var(--ma)'}">
          ${num(b.wn) ? 'Wn ' + pln(b.wn) : 'Ma ' + pln(b.ma)}</span></div>`).join('')}
      <div class="kv" style="border-top:1px solid var(--line);margin-top:4px">
        <span class="k" style="color:var(--text)">Razem</span>
        <span class="v">${pln(c.sums.boWn)} / ${pln(c.sums.boMa)}</span></div>
    </div>` : `<button class="btn wide ghost" data-act="bo">+ Bilans otwarcia</button>`;

  const ops = c.ops.length ? `<div class="opgrid">${c.ops.map((op, i) => opRow(op, i)).join('')}</div>` :
    `<div class="glass pane"><div class="empty">Brak operacji.<br>Dodaj pierwszą — albo zajrzyj do podpowiedzi, jak co zaksięgować.</div></div>`;

  return `
    ${bo}
    ${secHead('Dziennik', c.ops.length ? 'suma ' + pln(c.sums.dziennik) + ' zł' : '')}
    ${ops}
    <div class="btnrow">
      <button class="btn primary" data-act="new-op">+ Operacja</button>
      <button class="btn ghost" data-act="schematy">Jak zaksięgować?</button>
    </div>`;
}

function opRow(op, i) {
  const dek = opWn(op).map(l => `<span class="w">Wn ${esc(l.k)}</span>`).join(' ') + ' / ' +
              opMa(op).map(l => `<span class="m">Ma ${esc(l.k)}</span>`).join(' ');
  return `<button class="op" data-act="edit-op" data-id="${op.id}">
    <span class="lp">${i + 1}</span>
    <span class="body">
      <span class="t">${esc(op.tresc || 'Operacja ' + (i + 1))}</span>
      <span class="d">${op.dowod ? `<span class="pill">${esc(op.dowod)}</span>` : ''}<span class="dek">${dek}</span></span>
    </span>
    <span class="kw">${pln(opKwota(op))}</span>
  </button>`;
}

/* ---------- konta teowe ---------- */
function kKonta(t, c) {
  if (!c.list.length) return `<div class="glass pane"><div class="empty">Konta pojawią się, gdy dodasz bilans otwarcia albo pierwszą operację.</div></div>`;
  return `<div class="kontagrid">${c.list.map(a => kontoT(a)).join('')}</div>`;
}

function kontoT(a) {
  const wn = [], ma = [];
  if (a.boWn) wn.push({ lp: 'Bo', kwota: a.boWn, bo: 1 });
  if (a.boMa) ma.push({ lp: 'Bo', kwota: a.boMa, bo: 1 });
  a.zapisy.forEach(z => (z.s === 'wn' ? wn : ma).push({ lp: z.lp, kwota: z.kwota }));
  const rows = arr => arr.length
    ? arr.map(r => `<div class="row${r.bo ? ' bo' : ''}"><span class="lp">${esc(String(r.lp))}</span><span>${pln(r.kwota)}</span></div>`).join('')
    : '<div class="row"><span class="lp">—</span><span>0,00</span></div>';

  const saldo = a.saldoWn > 0 ? `<span class="pill wn">Saldo Wn</span><span class="sal">${pln(a.saldoWn)}</span>`
    : a.saldoMa > 0 ? `<span class="pill ma">Saldo Ma</span><span class="sal">${pln(a.saldoMa)}</span>`
    : `<span class="pill">Konto zamknięte</span><span class="sal">0,00</span>`;

  return `<div class="konto">
    <div class="kh">
      <span class="nr">${esc(a.k)}</span>
      <span class="nm">${esc(a.info.n)}</span>
      <span class="pill right">${TYPE_SHORT[a.info.t] || '?'}</span>
    </div>
    <div class="tt">
      <div class="side-wn"><div class="sl">Winien</div>${rows(wn)}
        <div class="ob"><span>Obroty</span><b>${pln(a.boWn + a.obWn)}</b></div></div>
      <div class="side-ma"><div class="sl">Ma</div>${rows(ma)}
        <div class="ob"><span>Obroty</span><b>${pln(a.boMa + a.obMa)}</b></div></div>
    </div>
    <div class="kf">${saldo}</div>
  </div>`;
}

/* ---------- zestawienie obrotów i sald ---------- */
function kZois(t, c) {
  const list = c.list.filter(a => a.info.t !== 'PB');
  if (!list.length) return `<div class="glass pane"><div class="empty">Nie ma jeszcze czego zestawiać.</div></div>`;
  const zgodne = Math.abs(c.sums.obWn - c.sums.obMa) < 0.005 && Math.abs(c.sums.saldoWn - c.sums.saldoMa) < 0.005;
  return `
    <div class="glass pane">
      <div class="tablewrap"><table class="data">
        <thead><tr><th>Konto</th><th class="n">Bo Wn</th><th class="n">Bo Ma</th>
          <th class="n">Obroty Wn</th><th class="n">Obroty Ma</th><th class="n">Saldo Wn</th><th class="n">Saldo Ma</th></tr></thead>
        <tbody>
        ${list.map(a => `<tr>
          <td class="name">${esc(a.k)} <span class="ak">${esc(a.info.n)}</span></td>
          <td class="n">${a.boWn ? pln(a.boWn) : '—'}</td>
          <td class="n">${a.boMa ? pln(a.boMa) : '—'}</td>
          <td class="n">${a.obWn ? pln(a.obWn) : '—'}</td>
          <td class="n">${a.obMa ? pln(a.obMa) : '—'}</td>
          <td class="n">${a.saldoWn ? pln(a.saldoWn) : '—'}</td>
          <td class="n">${a.saldoMa ? pln(a.saldoMa) : '—'}</td></tr>`).join('')}
        <tr class="total"><td>Razem</td>
          <td class="n">${pln(c.sums.boWn)}</td><td class="n">${pln(c.sums.boMa)}</td>
          <td class="n">${pln(c.sums.obWn)}</td><td class="n">${pln(c.sums.obMa)}</td>
          <td class="n">${pln(c.sums.saldoWn)}</td><td class="n">${pln(c.sums.saldoMa)}</td></tr>
        </tbody>
      </table></div>
    </div>
    ${banner(zgodne
      ? `${icon('<path d="M20 6 9 17l-5-5"/>')}<span>Zestawienie się zgadza. Suma obrotów ${esc(pln(c.sums.obWn))} zł równa się sumie z dziennika ${esc(pln(c.sums.dziennik))} zł.</span>`
      : `${icon('<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/>')}<span>Sumy się nie zgadzają — sprawdź operacje zaznaczone wyżej.</span>`,
      zgodne ? 'ok' : 'alert')}
    <button class="btn wide ghost" data-act="copy-task">Skopiuj całe rozwiązanie</button>`;
}

/* ---------- bilans zamknięcia ---------- */
function kBilans(t, c) {
  const b = buildBilans(c);
  const row = (poz, o) => {
    const v = o[poz.k];
    if (poz.sum) return `<tr class="strong"><td>${esc(poz.n)}</td><td class="n">${pln(v || 0)}</td></tr>`;
    if (v === undefined || Math.abs(v) < 0.005) return '';
    const zr = (b.zrodla[poz.k] || []).map(z => z.k).join(', ');
    return `<tr><td class="name">&nbsp;&nbsp;${esc(poz.n)}${zr ? ` <span class="ak">${esc(zr)}</span>` : ''}</td><td class="n">${pln(v)}</td></tr>`;
  };
  const zgodny = Math.abs(b.rozjazd) < 0.005;
  return `
    <div class="glass pane">
      <div class="eyebrow" style="margin-bottom:8px">Aktywa</div>
      <table class="data"><tbody>${BILANS_A.map(p => row(p, b.A)).join('')}
        <tr class="total"><td>Aktywa razem</td><td class="n">${pln(b.aktywa)}</td></tr></tbody></table>
    </div>
    <div class="glass pane">
      <div class="eyebrow" style="margin-bottom:8px">Pasywa</div>
      <table class="data"><tbody>${BILANS_P.map(p => row(p, b.P)).join('')}
        <tr class="total"><td>Pasywa razem</td><td class="n">${pln(b.pasywa)}</td></tr></tbody></table>
    </div>
    ${banner(zgodny
      ? `${icon('<path d="M20 6 9 17l-5-5"/>')}<span>Aktywa = pasywa = ${esc(pln(b.aktywa))} zł. Bilans się zamyka.</span>`
      : `${icon('<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/>')}<span>Aktywa i pasywa różnią się o ${esc(pln(Math.abs(b.rozjazd)))} zł. Zwykle znaczy to, że któraś operacja została zaksięgowana tylko po jednej stronie.</span>`,
      zgodny ? 'ok' : 'alert')}
    ${b.dopisanyWynik ? note(`Konta wynikowe są jeszcze otwarte, więc wynik ${b.dopisanyWynik >= 0 ? 'dodatni' : 'ujemny'} ${pln(Math.abs(b.dopisanyWynik))} zł doliczyłem do kapitału własnego. Po przeksięgowaniu na konto 860 pozycja weźmie się z konta.`) : ''}`;
}

/* ---------- rachunek zysków i strat ---------- */
function kRzis(t, c) {
  const r = buildRzis(c);
  const w = wynikZKont(c);
  if (!Object.keys(r).length || (!r['A'] && !r['B'])) {
    return `<div class="glass pane"><div class="empty">Rachunek zysków i strat pojawi się, gdy zaksięgujesz przychody albo koszty.</div></div>`;
  }
  return `
    ${result(w.wynik >= 0 ? 'Zysk netto' : 'Strata netto', pln(Math.abs(r['K'] ?? w.wynik)) + ' zł',
      `przychody ${pln(w.przych)} zł − koszty ${pln(w.koszt)} zł`, w.wynik >= 0 ? 'good' : 'bad')}
    <div class="glass pane">
      <div class="eyebrow" style="margin-bottom:8px">Rachunek zysków i strat — wariant porównawczy</div>
      <table class="data"><tbody>
        ${RZIS.map(p => {
          const v = r[p.k];
          if (v === undefined && !p.sum && !p.calc) return '';
          if (!p.sum && !p.strong && Math.abs(v || 0) < 0.005) return '';
          const cls = p.sum || p.strong ? ' class="strong"' : '';
          const ind = p.k.indexOf('.') > 0 ? '&nbsp;&nbsp;' : '';
          return `<tr${cls}><td>${ind}${esc(p.k)}. ${esc(p.n)}${p.calc ? ` <span class="ak">${esc(p.calc)}</span>` : ''}</td>
            <td class="n">${pln(v || 0)}</td></tr>`;
        }).join('')}
      </tbody></table>
    </div>
    ${note('Wariant porównawczy: koszty w układzie rodzajowym (zespół 4). Gdy zadanie każe liczyć wariantem kalkulacyjnym, koszty biorą się z zespołu 5.')}`;
}

/* ============================================================
   ARKUSZE
   ============================================================ */
function sheetTasks() {
  openSheet(`<h3>Zadania</h3><div class="sub">Każde zadanie ma własne konta, operacje i bilans.</div>
    <div class="stack">${S.tasks.map(t => `<div class="accrow" style="cursor:default">
      <button class="linkish" data-act="open-task" data-id="${t.id}" style="flex:1;text-align:left;color:${t.id === S.currentTask ? 'var(--accent)' : 'var(--text)'};font-size:13px">
        ${esc(t.name)}<span class="muted tiny" style="display:block;font-weight:400">${t.ops.length} ${plural(t.ops.length, 'operacja', 'operacje', 'operacji')} · ${fmtDate(t.created)}</span>
      </button>
      <button class="btn sm ghost" data-act="rename-task" data-id="${t.id}">Nazwa</button>
      <button class="btn sm ghost danger" data-act="del-task" data-id="${t.id}">×</button>
    </div>`).join('') || '<div class="empty">Brak zadań</div>'}</div>
    <div class="btnrow" style="margin-top:14px">
      <button class="btn ghost" data-act="close">Zamknij</button>
      <button class="btn primary" data-act="new-task">Nowe zadanie</button>
    </div>`);
}

function sheetBO() {
  const t = curTask();
  openSheet(`<h3>Bilans otwarcia</h3><div class="sub">Stany kont na początek okresu. Suma Wn musi równać się sumie Ma.</div>
    <div class="stack" id="bo-list">${(t.bo || []).map((b, i) => `<div class="accrow" style="cursor:default">
      <span class="nr">${esc(b.konto)}</span>
      <span class="nm">${esc(accInfo(b.konto, t).n)}</span>
      <span class="tp" style="color:${num(b.wn) ? 'var(--wn)' : 'var(--ma)'}">${num(b.wn) ? 'Wn ' + pln(b.wn) : 'Ma ' + pln(b.ma)}</span>
      <button class="btn sm ghost danger" data-act="del-bo" data-i="${i}">×</button>
    </div>`).join('') || '<div class="empty tiny">Jeszcze nic tu nie ma</div>'}</div>

    <div class="eyebrow" style="margin:16px 0 8px">Dodaj konto</div>
    <button class="btn wide ghost" data-act="pick" data-target="bo">${boDraft.k ? esc(boDraft.k + ' · ' + accInfo(boDraft.k, t).n) : 'Wybierz konto'}</button>
    <div class="two" style="margin-top:10px">
      <div class="field"><label for="f-boWn">Saldo Wn</label><input id="f-boWn" data-f="boWn" type="text" inputmode="decimal" placeholder="0,00" value="${esc(boDraft.wn || '')}"></div>
      <div class="field"><label for="f-boMa">Saldo Ma</label><input id="f-boMa" data-f="boMa" type="text" inputmode="decimal" placeholder="0,00" value="${esc(boDraft.ma || '')}"></div>
    </div>
    <button class="btn wide" data-act="add-bo">Dodaj do bilansu otwarcia</button>
    <button class="btn wide ghost" data-act="close" style="margin-top:8px">Gotowe</button>`);
}

function sheetOp(id) {
  const t = curTask();
  const existing = id ? t.ops.find(o => o.id === id) : null;
  if (!opDraft || opDraft.id !== (id || 'new')) {
    opDraft = existing
      ? { id: existing.id, dowod: existing.dowod, tresc: existing.tresc, zlozony: existing.lines.length > 2,
          kwota: opKwota(existing), wn: (opWn(existing)[0] || {}).k, ma: (opMa(existing)[0] || {}).k,
          lines: JSON.parse(JSON.stringify(existing.lines)) }
      : { id: 'new', dowod: '', tresc: '', kwota: '', wn: '', ma: '', zlozony: false, lines: [] };
  }
  const d = opDraft;
  const accBtn = (target, val) => `<button class="btn wide ghost" data-act="pick" data-target="${target}" style="justify-content:flex-start;font-size:13px">
    ${val ? `<b style="color:var(--${target.indexOf('wn') >= 0 ? 'wn' : 'ma'})">${esc(val)}</b> <span class="muted tiny">${esc(accInfo(val, t).n)}</span>` : 'Wybierz konto'}</button>`;

  const proste = `
    <div class="field"><label>Konto Wn — strona Winien</label>${accBtn('wn', d.wn)}</div>
    <div class="field"><label>Konto Ma — strona Ma</label>${accBtn('ma', d.ma)}</div>`;

  const zlozony = `
    <div class="eyebrow" style="margin:4px 0 8px">Pozycje zapisu</div>
    <div class="stack" style="margin-bottom:10px">${(d.lines || []).map((l, i) => `<div class="accrow" style="cursor:default;gap:7px">
      <button class="btn sm ghost" data-act="line-side" data-i="${i}" style="flex:none;color:var(--${l.s === 'wn' ? 'wn' : 'ma'});min-width:44px">${l.s === 'wn' ? 'Wn' : 'Ma'}</button>
      <button class="btn sm ghost" data-act="pick" data-target="line-${i}" style="flex:1;justify-content:flex-start">${l.k ? esc(l.k) + ' ' + esc(accInfo(l.k, t).n).slice(0, 16) : 'konto'}</button>
      <input data-f="line-${i}" value="${esc(l.kwota || '')}" inputmode="decimal" placeholder="kwota" style="width:92px;padding:8px 10px;font-size:13px;text-align:right">
      <button class="btn sm ghost danger" data-act="del-line" data-i="${i}">×</button>
    </div>`).join('')}</div>
    <button class="btn wide ghost sm" data-act="add-line">+ Pozycja</button>`;

  openSheet(`<h3>${existing ? 'Operacja' : 'Nowa operacja'}</h3>
    <div class="sub">Dowód, treść i kwota — resztę policzę na kontach.</div>
    <div class="two">
      <div class="field"><label for="f-dowod">Dowód</label>
        <input id="f-dowod" data-f="dowod" value="${esc(d.dowod || '')}" placeholder="np. WB 3" autocomplete="off"></div>
      <div class="field"><label for="f-kwota">Kwota</label>
        <input id="f-kwota" data-f="kwota" value="${esc(d.kwota || '')}" inputmode="decimal" placeholder="0,00" ${d.zlozony ? 'disabled' : ''}></div>
    </div>
    <div class="field"><label for="f-tresc">Treść operacji</label>
      <input id="f-tresc" data-f="tresc" value="${esc(d.tresc || '')}" placeholder="np. Wpłata gotówki do banku" autocomplete="off"></div>
    ${d.zlozony ? zlozony : proste}
    ${toggle('zlozony', 'Zapis złożony', 'jedna operacja na więcej niż dwóch kontach', d.zlozony)}
    <div class="btnrow" style="margin-top:6px">
      <button class="btn ghost" data-act="close">Anuluj</button>
      <button class="btn primary" data-act="save-op">${existing ? 'Zapisz' : 'Zaksięguj'}</button>
    </div>
    ${existing ? `<button class="btn wide ghost danger sm" data-act="del-op" data-id="${existing.id}" style="margin-top:8px">Usuń operację</button>` : ''}
    <button class="btn wide ghost sm" data-act="schematy" style="margin-top:8px">Podpowiedz dekretację</button>`);
}

/* ------------------------------------------------------------
   Listy z wyszukiwarką. Lista odświeża się osobno, żeby pisanie
   w polu nie gubiło kursora.
   ------------------------------------------------------------ */
function filtrujPlan(q) {
  q = (q || '').toLowerCase().trim();
  return PLAN.filter(a => !q || a.k.indexOf(q) === 0 || a.n.toLowerCase().indexOf(q) >= 0);
}
function listaKont(q, klik) {
  const lista = filtrujPlan(q);
  const grupy = ZESPOLY.map(z => ({ z, acc: lista.filter(a => a.k[0] === z.z) })).filter(g => g.acc.length);
  if (!grupy.length) return '<div class="empty">Nic takiego nie ma w planie kont</div>';
  return grupy.map(g => `<div class="zgrp">Zespół ${g.z.z} — ${esc(g.z.n)}</div>
    ${g.acc.map(a => klik
      ? `<button class="accrow" data-act="pick-acc" data-k="${a.k}">
           <span class="nr">${a.k}</span><span class="nm">${esc(a.n)}</span><span class="tp">${TYPE_SHORT[a.t]}</span></button>`
      : `<div class="accrow" style="cursor:default;align-items:flex-start">
           <span class="nr">${a.k}</span>
           <span class="nm" style="white-space:normal">${esc(a.n)}
             <span class="muted tiny" style="display:block;margin-top:2px">${TYPE_NAME[a.t]} · rośnie po stronie ${TYPE_GROW[a.t]}</span></span>
         </div>`).join('')}`).join('');
}
function listaSchematow(q) {
  q = (q || '').toLowerCase().trim();
  const grupy = SCHEMATY.map(g => ({ g: g.g, ops: g.ops.filter(o =>
    !q || o.n.toLowerCase().indexOf(q) >= 0 || o.l.some(l => l[0].indexOf(q) === 0)) })).filter(g => g.ops.length);
  if (!grupy.length) return '<div class="empty">Nic nie pasuje. Zaksięguj ręcznie — plan kont podpowie typ konta.</div>';
  return grupy.map(g => `<div class="zgrp">${esc(g.g)}</div>
    ${g.ops.map(o => `<button class="accrow" data-act="use-schemat" data-n="${esc(o.n)}" data-d="${esc(o.d)}" data-l="${esc(JSON.stringify(o.l))}" style="align-items:flex-start">
      <span class="nm" style="white-space:normal">${esc(o.n)}
        <span class="dek" style="display:block;margin-top:3px">${o.l.map(l => `<span class="${l[1] === 'wn' ? 'w' : 'm'}">${l[1] === 'wn' ? 'Wn' : 'Ma'} ${l[0]}</span>`).join(' / ')}</span></span>
      <span class="tp">${esc(o.d)}</span></button>`).join('')}`).join('');
}

function sheetPick(target) {
  pickTarget = target;
  openSheet(`<h3>Wybierz konto</h3><div class="sub">Wpisz numer albo nazwę. Konto spoza planu dodasz na dole.</div>
    <div class="search"><input data-lq="kont" placeholder="np. 131 albo kasa" autocomplete="off" inputmode="search"></div>
    <div class="acclist">${listaKont('', true)}</div>
    <button class="btn wide ghost sm" data-act="own-acc" style="margin-top:12px">+ Konto spoza planu</button>`);
}

function sheetOwnAcc() {
  openSheet(`<h3>Własne konto</h3><div class="sub">Gdy zadanie używa konta, którego nie ma we wzorcowym planie.</div>
    ${field('ownK', 'Numer konta', { placeholder: 'np. 205' })}
    ${field('ownN', 'Nazwa', { placeholder: 'np. Rozrachunki z odbiorcą Kowalski' })}
    ${select('ownT', 'Typ konta', [
      { v: 'A', l: 'aktywne — saldo Wn' }, { v: 'P', l: 'pasywne — saldo Ma' },
      { v: 'AP', l: 'aktywno-pasywne' }, { v: 'K', l: 'kosztowe' },
      { v: 'Pr', l: 'przychodowe' }, { v: 'PB', l: 'pozabilansowe' }], 'A')}
    ${select('ownB', 'Pozycja w bilansie', [{ v: '', l: 'nie wykazuję w bilansie' }]
      .concat(BILANS_A.filter(p => !p.sum).map(p => ({ v: p.k, l: 'Aktywa · ' + p.n })))
      .concat(BILANS_P.filter(p => !p.sum).map(p => ({ v: p.k, l: 'Pasywa · ' + p.n }))), '')}
    <div class="btnrow"><button class="btn ghost" data-act="close">Anuluj</button>
      <button class="btn primary" data-act="save-own">Dodaj konto</button></div>`);
}

function sheetSchematy() {
  openSheet(`<h3>Jak to zaksięgować</h3><div class="sub">Typowe operacje i ich dekretacja. W zadaniu zawsze rządzi treść polecenia.</div>
    <div class="search"><input data-lq="schemat" placeholder="np. wynagrodzenie, 131" autocomplete="off" inputmode="search"></div>
    <div class="acclist">${listaSchematow('')}</div>
    <button class="btn wide ghost sm" data-act="close" style="margin-top:12px">Zamknij</button>`);
}

function sheetPlanKont() {
  openSheet(`<h3>Plan kont</h3><div class="sub">Typ konta mówi, po której stronie rośnie i gdzie trafia w sprawozdaniu.</div>
    <div class="search"><input data-lq="plan" placeholder="szukaj numeru albo nazwy" autocomplete="off" inputmode="search"></div>
    <div class="acclist">${listaKont('', false)}</div>
    <button class="btn wide ghost sm" data-act="close" style="margin-top:12px">Zamknij</button>`);
}

/* Wpisywanie w wyszukiwarkę odświeża samą listę. */
function odswiezListe(el) {
  const rodzaj = el.dataset.lq;
  const box = $('.acclist', $('#sheet'));
  if (!box) return;
  box.innerHTML = rodzaj === 'schemat' ? listaSchematow(el.value)
    : listaKont(el.value, rodzaj === 'kont');
}

/* ============================================================
   AKCJE MODUŁU KSIĄG
   ============================================================ */

/* Zanim arkusz zostanie przerysowany (np. po wyborze konta),
   przepisz to, co użytkownik zdążył wpisać. */
function syncSheet() {
  const root = $('#sheet');
  if (!root) return;
  const f = readForm(root);
  if (f.boWn !== undefined) { boDraft.wn = f.boWn; boDraft.ma = f.boMa; }
  if (!opDraft) return;
  ['dowod', 'tresc', 'kwota'].forEach(k => { if (f[k] !== undefined) opDraft[k] = f[k]; });
  (opDraft.lines || []).forEach((l, i) => { if (f['line-' + i] !== undefined) l.kwota = f['line-' + i]; });
}
const reopenOp = () => sheetOp(opDraft && opDraft.id !== 'new' ? opDraft.id : null);

ACT['ksub'] = b => { kSub = b.dataset.v; render(); };

/* ---------- zadania ---------- */
ACT['tasks'] = () => sheetTasks();
ACT['new-task'] = () => openSheet(`<h3>Nowe zadanie</h3><div class="sub">Nazwa pomoże wrócić do niego później.</div>
  ${field('taskName', 'Nazwa zadania', { placeholder: 'np. Zadanie 12 — ewidencja operacji', type: 'text', value: 'Zadanie ' + (S.tasks.length + 1) })}
  <div class="btnrow"><button class="btn ghost" data-act="close">Anuluj</button>
    <button class="btn primary" data-act="save-task">Zacznij</button></div>`);
ACT['save-task'] = () => {
  newTask((readForm($('#sheet')).taskName || '').trim());
  kSub = 'dziennik'; closeSheet(); render();
};
ACT['open-task'] = b => { S.currentTask = b.dataset.id; save(); kSub = 'dziennik'; closeSheet(); render(); };
ACT['rename-task'] = b => {
  const t = S.tasks.find(x => x.id === b.dataset.id);
  openSheet(`<h3>Nazwa zadania</h3>${field('taskName', 'Nazwa', { value: t.name, type: 'text' })}
    <input type="hidden" data-f="taskId" value="${t.id}">
    <div class="btnrow"><button class="btn ghost" data-act="close">Anuluj</button>
      <button class="btn primary" data-act="do-rename">Zapisz</button></div>`);
};
ACT['do-rename'] = () => {
  const f = readForm($('#sheet'));
  const t = S.tasks.find(x => x.id === f.taskId);
  if (t && f.taskName.trim()) { t.name = f.taskName.trim(); save(); }
  closeSheet(); render();
};
ACT['del-task'] = b => {
  const t = S.tasks.find(x => x.id === b.dataset.id);
  if (!confirm(`Usunąć „${t.name}" razem z operacjami? Tego nie da się cofnąć.`)) return;
  S.tasks = S.tasks.filter(x => x.id !== b.dataset.id);
  if (S.currentTask === b.dataset.id) S.currentTask = S.tasks.length ? S.tasks[0].id : null;
  save(); closeSheet(); render();
};

/* ---------- bilans otwarcia ---------- */
ACT['bo'] = () => { if (!curTask()) newTask(); sheetBO(); };
ACT['add-bo'] = () => {
  syncSheet();
  const t = curTask();
  if (!boDraft.k) return toast('Wybierz konto');
  const wn = round2(num(boDraft.wn)), ma = round2(num(boDraft.ma));
  if (!wn && !ma) return toast('Podaj saldo');
  t.bo.push({ konto: boDraft.k, wn, ma });
  boDraft = { k: '', wn: '', ma: '' };
  save(); sheetBO(); render();
};
ACT['del-bo'] = b => { curTask().bo.splice(+b.dataset.i, 1); save(); sheetBO(); render(); };

/* ---------- operacje ---------- */
ACT['new-op'] = () => { if (!curTask()) newTask(); opDraft = null; sheetOp(null); };
ACT['edit-op'] = b => { opDraft = null; sheetOp(b.dataset.id); };
ACT['del-op'] = b => {
  const t = curTask();
  t.ops = t.ops.filter(o => o.id !== b.dataset.id);
  save(); opDraft = null; closeSheet(); render();
};
ACT['save-op'] = () => {
  syncSheet();
  const t = curTask(), d = opDraft;
  let lines;
  if (d.zlozony) {
    lines = (d.lines || []).filter(l => l.k && num(l.kwota) > 0)
      .map(l => ({ k: l.k, s: l.s, kwota: round2(num(l.kwota)) }));
    if (lines.length < 2) return toast('Zapis potrzebuje pozycji po obu stronach');
  } else {
    const kw = round2(num(d.kwota));
    if (!(kw > 0)) return toast('Podaj kwotę');
    if (!d.wn || !d.ma) return toast('Wybierz konto Wn i konto Ma');
    lines = [{ k: d.wn, s: 'wn', kwota: kw }, { k: d.ma, s: 'ma', kwota: kw }];
  }
  const op = { id: d.id === 'new' ? uid() : d.id, dowod: (d.dowod || '').trim(), tresc: (d.tresc || '').trim(), lines };
  if (d.id === 'new') t.ops.push(op);
  else t.ops[t.ops.findIndex(o => o.id === d.id)] = op;
  save(); opDraft = null; closeSheet(); render();
  toast('Zaksięgowano');
};
ACT['add-line'] = () => { syncSheet(); opDraft.lines.push({ k: '', s: 'ma', kwota: '' }); reopenOp(); };
ACT['del-line'] = b => { syncSheet(); opDraft.lines.splice(+b.dataset.i, 1); reopenOp(); };
ACT['line-side'] = b => {
  syncSheet();
  const l = opDraft.lines[+b.dataset.i];
  l.s = l.s === 'wn' ? 'ma' : 'wn';
  reopenOp();
};

/* Przełącznik „zapis złożony" przebudowuje arkusz. */
function opToggle(name) {
  if (name !== 'zlozony' || !opDraft) return false;
  syncSheet();
  opDraft.zlozony = !opDraft.zlozony;
  if (opDraft.zlozony && !(opDraft.lines || []).length) {
    const kw = opDraft.kwota || '';
    opDraft.lines = [{ k: opDraft.wn || '', s: 'wn', kwota: kw }, { k: opDraft.ma || '', s: 'ma', kwota: kw }];
  }
  reopenOp();
  return true;
}

/* ---------- wybór konta ---------- */
ACT['pick'] = b => { syncSheet(); sheetPick(b.dataset.target); };
ACT['pick-acc'] = b => {
  const k = b.dataset.k;
  if (pickTarget === 'bo') { boDraft.k = k; sheetBO(); return; }
  if (!opDraft) opDraft = { id: 'new', dowod: '', tresc: '', kwota: '', wn: '', ma: '', zlozony: false, lines: [] };
  if (pickTarget && pickTarget.indexOf('line-') === 0) opDraft.lines[+pickTarget.slice(5)].k = k;
  else opDraft[pickTarget] = k;
  reopenOp();
};
ACT['own-acc'] = () => sheetOwnAcc();
ACT['save-own'] = () => {
  const f = readForm($('#sheet'));
  const k = (f.ownK || '').trim();
  if (!k) return toast('Podaj numer konta');
  const t = curTask() || newTask();
  t.extra[k] = { n: (f.ownN || '').trim() || 'Konto ' + k, t: f.ownT,
                 b: f.ownB && f.ownB.slice(0, 2) !== 'PA' && f.ownB.slice(0, 2) !== 'PB' ? f.ownB : undefined,
                 bp: f.ownB && (f.ownB.slice(0, 2) === 'PA' || f.ownB.slice(0, 2) === 'PB') ? f.ownB : undefined };
  if (t.extra[k].bp && !t.extra[k].b) t.extra[k].b = t.extra[k].bp;
  save();
  if (pickTarget === 'bo') { boDraft.k = k; sheetBO(); }
  else {
    if (!opDraft) opDraft = { id: 'new', dowod: '', tresc: '', kwota: '', wn: '', ma: '', zlozony: false, lines: [] };
    if (pickTarget && pickTarget.indexOf('line-') === 0) opDraft.lines[+pickTarget.slice(5)].k = k;
    else if (pickTarget) opDraft[pickTarget] = k;
    reopenOp();
  }
};

/* ---------- podpowiedzi ---------- */
ACT['schematy'] = () => { syncSheet(); sheetSchematy(); };
ACT['plan-kont'] = () => sheetPlanKont();
ACT['use-schemat'] = b => {
  const l = JSON.parse(b.dataset.l);
  if (!curTask()) newTask();
  if (!opDraft) opDraft = { id: 'new', dowod: '', tresc: '', kwota: '', wn: '', ma: '', zlozony: false, lines: [] };
  if (!opDraft.tresc) opDraft.tresc = b.dataset.n;
  if (!opDraft.dowod) opDraft.dowod = b.dataset.d;
  if (l.length === 2) {
    opDraft.zlozony = false;
    opDraft.wn = (l.find(x => x[1] === 'wn') || [''])[0];
    opDraft.ma = (l.find(x => x[1] === 'ma') || [''])[0];
  } else {
    opDraft.zlozony = true;
    opDraft.lines = l.map(x => ({ k: x[0], s: x[1], kwota: '' }));
  }
  reopenOp();
};

ACT['copy-task'] = () => {
  const t = curTask();
  if (t) copyText(taskToText(t), 'Rozwiązanie skopiowane');
};
