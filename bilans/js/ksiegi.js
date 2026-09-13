"use strict";
/* ============================================================
   Księgi — zadanie na kontach od początku do końca:
   bilans otwarcia → dziennik → konta teowe → zestawienie obrotów
   i sald → bilans zamknięcia → rachunek zysków i strat.
   ============================================================ */

let kSub = 'dziennik';          // podstrona modułu
let kFocus = null;              // konto pokazane w całości

/* ---------- zadania ---------- */
function newTask(name) {
  const t = { id: uid(), name: name || 'Zadanie ' + (S.tasks.length + 1), created: ymd(TODAY), bo: [], ops: [], extra: {} };
  S.tasks.unshift(t);
  S.currentTask = t.id;
  save();
  return t;
}
const curTask = () => S.tasks.find(t => t.id === S.currentTask) || null;

function accInfo(k, task) {
  const own = task && task.extra && task.extra[k];
  const std = PLAN_BY_K[k];
  if (own) return { k, n: own.n || (std ? std.n : 'Konto ' + k), t: own.t || (std ? std.t : 'AP'), b: own.b || (std && std.b), bp: own.bp || (std && std.bp), s: std && std.s, r: own.r || (std && std.r) };
  if (std) return std;
  return { k, n: 'Konto ' + k, t: 'AP' };
}

/* ------------------------------------------------------------
   Silnik: z bilansu otwarcia i dziennika robi obroty i salda.
   ------------------------------------------------------------ */
function calcTask(task) {
  const acc = {};
  const touch = k => {
    if (!acc[k]) acc[k] = { k, info: accInfo(k, task), boWn: 0, boMa: 0, obWn: 0, obMa: 0, zapisy: [] };
    return acc[k];
  };

  (task.bo || []).forEach(b => {
    const a = touch(b.konto);
    a.boWn += num(b.wn); a.boMa += num(b.ma);
  });

  const ops = task.ops || [];
  ops.forEach((op, i) => {
    (op.lines || []).forEach(l => {
      if (!l.k) return;
      const a = touch(l.k);
      const kw = round2(num(l.kwota));
      if (l.s === 'wn') { a.obWn += kw; a.zapisy.push({ lp: i + 1, s: 'wn', kwota: kw, op }); }
      else { a.obMa += kw; a.zapisy.push({ lp: i + 1, s: 'ma', kwota: kw, op }); }
    });
  });

  const list = Object.values(acc).map(a => {
    a.boWn = round2(a.boWn); a.boMa = round2(a.boMa);
    a.obWn = round2(a.obWn); a.obMa = round2(a.obMa);
    const wn = a.boWn + a.obWn, ma = a.boMa + a.obMa;
    const d = round2(wn - ma);
    a.sumWn = round2(wn); a.sumMa = round2(ma);
    a.saldoWn = d > 0 ? d : 0;
    a.saldoMa = d < 0 ? -d : 0;
    a.saldo = d;
    return a;
  }).sort((x, y) => x.k.localeCompare(y.k, 'pl', { numeric: true }));

  const bilansowe = list.filter(a => a.info.t !== 'PB');
  const S_ = f => round2(bilansowe.reduce((s, a) => s + a[f], 0));
  const sums = {
    boWn: S_('boWn'), boMa: S_('boMa'), obWn: S_('obWn'), obMa: S_('obMa'),
    saldoWn: S_('saldoWn'), saldoMa: S_('saldoMa')
  };
  sums.dziennik = round2(ops.reduce((s, op) => s + opKwota(op), 0));

  /* Ostrzeżenia — to one uczą najwięcej. */
  const uwagi = [];
  ops.forEach((op, i) => {
    const wn = round2((op.lines || []).filter(l => l.s === 'wn').reduce((s, l) => s + num(l.kwota), 0));
    const ma = round2((op.lines || []).filter(l => l.s === 'ma').reduce((s, l) => s + num(l.kwota), 0));
    if (Math.abs(wn - ma) > 0.004) uwagi.push({ t: 'bad', m: `Operacja ${i + 1}: strona Wn ${pln(wn)} ≠ strona Ma ${pln(ma)}` });
  });
  if (Math.abs(sums.boWn - sums.boMa) > 0.004) uwagi.push({ t: 'bad', m: `Bilans otwarcia się nie zgadza: Wn ${pln(sums.boWn)} ≠ Ma ${pln(sums.boMa)}` });
  if (Math.abs(sums.obWn - sums.obMa) > 0.004) uwagi.push({ t: 'bad', m: 'Obroty Wn ≠ obroty Ma — któraś operacja jest zaksięgowana jednostronnie' });
  list.forEach(a => {
    if (a.info.t === 'A' && a.saldoMa > 0.004) uwagi.push({ t: 'warn', m: `${a.k} jest kontem aktywnym, a ma saldo Ma ${pln(a.saldoMa)}` });
    if (a.info.t === 'P' && a.saldoWn > 0.004) uwagi.push({ t: 'warn', m: `${a.k} jest kontem pasywnym, a ma saldo Wn ${pln(a.saldoWn)}` });
  });

  return { list, acc, sums, uwagi, ops };
}

const opKwota = op => round2((op.lines || []).filter(l => l.s === 'wn').reduce((s, l) => s + num(l.kwota), 0));
const opWn = op => (op.lines || []).filter(l => l.s === 'wn');
const opMa = op => (op.lines || []).filter(l => l.s === 'ma');

/* ------------------------------------------------------------
   Wynik finansowy z kont wynikowych — przydaje się, gdy zadanie
   kończy się przed przeksięgowaniem na konto 860.
   ------------------------------------------------------------ */
function wynikZKont(calc) {
  let przych = 0, koszt = 0;
  calc.list.forEach(a => {
    if (a.info.t === 'Pr') przych += a.saldoMa - a.saldoWn;
    if (a.info.t === 'K') koszt += a.saldoWn - a.saldoMa;
  });
  return { przych: round2(przych), koszt: round2(koszt), wynik: round2(przych - koszt) };
}

/* ------------------------------------------------------------
   Bilans zamknięcia — salda kont ułożone w pozycje sprawozdania.
   ------------------------------------------------------------ */
function buildBilans(calc) {
  const A = {}, P = {};
  const zrodla = {};
  /* Pozycje pasywów mają przedrostek PA/PB — po nim wiadomo, po której
     stronie bilansu ląduje saldo, niezależnie od typu konta. */
  const isPas = poz => !!poz && (poz.slice(0, 2) === 'PA' || poz.slice(0, 2) === 'PB');
  const put = (poz, v, a) => {
    if (!poz || Math.abs(v) < 0.005) return;
    const o = isPas(poz) ? P : A;
    o[poz] = round2((o[poz] || 0) + v);
    (zrodla[poz] = zrodla[poz] || []).push({ k: a.k, n: a.info.n, v });
  };

  calc.list.forEach(a => {
    const i = a.info;
    if (i.t === 'PB' || isWynikowe(i.t)) return;
    if (a.saldoWn === 0 && a.saldoMa === 0) return;

    if (i.s === -1) {                       // umorzenie — pomniejsza wartość aktywu
      put(i.b, -(a.saldoMa - a.saldoWn), a);
      return;
    }
    if (a.saldoWn > 0) {
      const poz = i.b || i.bp || 'B.II';
      put(poz, isPas(poz) ? -a.saldoWn : a.saldoWn, a);
    } else {
      const poz = i.bp || i.b || 'PB.III';
      put(poz, isPas(poz) ? a.saldoMa : -a.saldoMa, a);
    }
  });

  /* Konta wynikowe jeszcze otwarte? Wynik trafia do kapitału własnego,
     inaczej bilans nigdy by się nie spiął. */
  const w = wynikZKont(calc);
  let dopisanyWynik = 0;
  if (Math.abs(w.wynik) > 0.004) {
    P['PA.VI'] = round2((P['PA.VI'] || 0) + w.wynik);
    dopisanyWynik = w.wynik;
  }

  const detale = o => round2(Object.entries(o).reduce((s, [k, v]) => s + (k.indexOf('.') > 0 ? v : 0), 0));
  const grupa = (o, pref) => round2(Object.entries(o)
    .reduce((s, [k, v]) => s + (k.indexOf('.') > 0 && k.split('.')[0] === pref ? v : 0), 0));
  const aktywa = detale(A), pasywa = detale(P);
  A['A'] = grupa(A, 'A'); A['B'] = grupa(A, 'B');
  P['PA'] = grupa(P, 'PA'); P['PB'] = grupa(P, 'PB');

  return { A, P, aktywa, pasywa, zrodla, dopisanyWynik, rozjazd: round2(aktywa - pasywa) };
}

/* ------------------------------------------------------------
   Rachunek zysków i strat — wariant porównawczy.
   ------------------------------------------------------------ */
function buildRzis(calc) {
  const R = {};
  const put = (k, v) => { if (k) R[k] = round2((R[k] || 0) + v); };
  calc.list.forEach(a => {
    const i = a.info;
    if (!isWynikowe(i.t) || !i.r) return;
    const v = i.t === 'Pr' ? (a.saldoMa - a.saldoWn) : (a.saldoWn - a.saldoMa);
    put(i.r, v);
  });
  const g = pref => round2(Object.entries(R).reduce((s, [k, v]) => s + (k.split('.')[0] === pref && k.indexOf('.') > 0 ? v : 0), 0));
  R['A'] = g('A');
  R['B'] = g('B');
  R['C'] = round2(R['A'] - R['B']);
  R['F'] = round2(R['C'] + (R['D'] || 0) - (R['E'] || 0));
  R['I'] = round2(R['F'] + (R['G'] || 0) - (R['H'] || 0));
  R['K'] = round2(R['I'] - (R['J'] || 0));
  return R;
}

/* ------------------------------------------------------------
   Zadanie jako tekst — do zeszytu albo do wiadomości.
   ------------------------------------------------------------ */
function taskToText(task) {
  const c = calcTask(task);
  const L = [];
  L.push(task.name.toUpperCase());
  L.push('');
  if (task.bo.length) {
    L.push('BILANS OTWARCIA');
    task.bo.forEach(b => L.push(`  ${b.konto} ${accInfo(b.konto, task).n}: ${num(b.wn) ? 'Wn ' + pln(b.wn) : 'Ma ' + pln(b.ma)}`));
    L.push('');
  }
  L.push('DZIENNIK');
  c.ops.forEach((op, i) => {
    L.push(`  ${i + 1}. ${op.dowod ? op.dowod + ' — ' : ''}${op.tresc || ''}   ${pln(opKwota(op))} zł`);
    opWn(op).forEach(l => L.push(`       Wn ${l.k}  ${pln(l.kwota)}`));
    opMa(op).forEach(l => L.push(`       Ma ${l.k}  ${pln(l.kwota)}`));
  });
  L.push(`  Suma dziennika: ${pln(c.sums.dziennik)} zł`);
  L.push('');
  L.push('ZESTAWIENIE OBROTÓW I SALD');
  L.push('  Konto                      Obroty Wn     Obroty Ma      Saldo Wn      Saldo Ma');
  c.list.filter(a => a.info.t !== 'PB').forEach(a => {
    const nm = (a.k + ' ' + a.info.n).slice(0, 26).padEnd(26);
    L.push(`  ${nm} ${pln(a.obWn).padStart(11)} ${pln(a.obMa).padStart(13)} ${pln(a.saldoWn).padStart(13)} ${pln(a.saldoMa).padStart(13)}`);
  });
  L.push(`  ${'RAZEM'.padEnd(26)} ${pln(c.sums.obWn).padStart(11)} ${pln(c.sums.obMa).padStart(13)} ${pln(c.sums.saldoWn).padStart(13)} ${pln(c.sums.saldoMa).padStart(13)}`);
  const b = buildBilans(c);
  L.push('');
  L.push('BILANS ZAMKNIĘCIA');
  L.push(`  Aktywa razem: ${pln(b.aktywa)} zł`);
  L.push(`  Pasywa razem: ${pln(b.pasywa)} zł`);
  const w = wynikZKont(c);
  if (Math.abs(w.wynik) > 0.004) L.push(`  Wynik finansowy: ${w.wynik >= 0 ? 'zysk' : 'strata'} ${pln(Math.abs(w.wynik))} zł`);
  return L.join('\n');
}
