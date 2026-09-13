"use strict";
/* ============================================================
   Kalkulatory. Każdy ma formularz i wynik rozpisany krok po kroku —
   bo na lekcji liczy się nie tylko liczba, ale i droga do niej.
   ============================================================ */

/* Zapamiętane wartości pól: wracasz do kalkulatora i widzisz swoje dane. */
function toolVals(t) {
  return Object.assign({}, t.def || {}, S.calc[t.id] || {});
}
function saveVals(t, v) { S.calc[t.id] = v; save(); }

const ULGI = [
  { v: 'brak', l: 'bez ulgi' },
  { v: 'mlodzi', l: 'ulga dla młodych (do 26 lat)' },
  { v: 'powrot', l: 'ulga na powrót' },
  { v: 'rodzina', l: 'ulga dla rodzin 4+' },
  { v: 'senior', l: 'ulga dla pracujących seniorów' }
];

/* ============================================================
   PŁACE
   ============================================================ */

const T_UOP = {
  id: 'uop', n: 'Umowa o pracę', d: 'Brutto, netto i koszt pracodawcy',
  i: '<path d="M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  def: { kierunek: 'brutto', kwota: '5000', kup: '250', pit2: true, pit2W: '1', chorobowa: true,
         ulga: 'brak', ppk: false, wyp: '', narastPodst: '', narastDochod: '' },
  form(v) {
    return `
      ${seg('kierunek', [{ v: 'brutto', l: 'Z brutto' }, { v: 'netto', l: 'Z netto' }, { v: 'koszt', l: 'Z kosztu' }], v.kierunek)}
      ${field('kwota', v.kierunek === 'netto' ? 'Wynagrodzenie netto' : v.kierunek === 'koszt' ? 'Koszt pracodawcy' : 'Wynagrodzenie brutto',
        { value: v.kwota, suffix: 'zł' })}
      <div class="two">
        ${select('kup', 'Koszty uzyskania', [
          { v: String(P('kup')), l: pln(P('kup'), 0) + ' zł' },
          { v: String(P('kupP')), l: pln(P('kupP'), 0) + ' zł — dojazd' },
          { v: '0', l: 'bez kosztów' }], v.kup)}
        ${select('ulga', 'Ulga', ULGI, v.ulga)}
      </div>
      ${toggle('pit2', 'PIT-2 złożony', 'kwota zmniejszająca ' + pln(P('zmniej')) + ' zł miesięcznie', v.pit2)}
      ${v.pit2 ? seg('pit2W', [{ v: '1', l: '1/12' }, { v: '2', l: '1/24' }, { v: '3', l: '1/36' }], v.pit2W) : ''}
      ${toggle('chorobowa', 'Składka chorobowa', 'dobrowolna tylko przy zleceniu — przy etacie obowiązkowa', v.chorobowa)}
      ${toggle('ppk', 'PPK', 'pracownik ' + pln(P('ppkP'), 1) + '% · pracodawca ' + pln(P('ppkF'), 1) + '%', v.ppk)}
      <details class="more"><summary>Więcej ustawień</summary>
        <div class="two" style="margin-top:10px">
          ${field('wyp', 'Składka wypadkowa', { value: v.wyp, placeholder: pln(P('wyp')), suffix: '%' })}
          ${field('narastPodst', 'Podstawa ZUS od początku roku', { value: v.narastPodst, placeholder: '0', suffix: 'zł' })}
        </div>
        ${field('narastDochod', 'Dochód od początku roku', { value: v.narastDochod, placeholder: '0',
          hint: 'do progu 32%', suffix: 'zł' })}
      </details>`;
  },
  out(v) {
    const i = {
      kup: num(v.kup), pit2: v.pit2, pit2Wariant: v.pit2W, chorobowa: v.chorobowa,
      ulga: v.ulga === 'brak' ? null : v.ulga, ppk: v.ppk,
      wypadkowa: v.wyp === '' ? undefined : num(v.wyp),
      narastPodst: num(v.narastPodst), narastDochod: num(v.narastDochod),
      narastPrzych: num(v.narastPodst)
    };
    const kwota = num(v.kwota);
    const brutto = v.kierunek === 'netto' ? bruttoZNetto(kwota, i)
      : v.kierunek === 'koszt' ? kosztNaBrutto(kwota, i) : kwota;
    const r = calcUoP(Object.assign({ brutto }, i));
    lastUoP = r;

    return `
      <div class="outgrid">
        ${result('Na rękę', pln(r.netto) + ' zł', v.kierunek !== 'brutto' ? 'przy brutto ' + pln(r.brutto) + ' zł' : '', 'good')}
        ${result('Koszt pracodawcy', pln(r.koszt) + ' zł', 'klin podatkowy ' + pln(r.klin, 1) + '%')}
      </div>
      ${steps([
        { k: 'Wynagrodzenie brutto', v: pln(r.brutto) },
        { k: 'Składka emerytalna', f: pln(P('emeP')) + '% z brutto', v: '− ' + pln(r.emerytalna), tone: 'minus' },
        { k: 'Składka rentowa', f: pln(P('renP')) + '% z brutto', v: '− ' + pln(r.rentowa), tone: 'minus' },
        r.chorobowaS ? { k: 'Składka chorobowa', f: pln(P('chor')) + '% z brutto', v: '− ' + pln(r.chorobowaS), tone: 'minus' } : null,
        { k: 'Podstawa składki zdrowotnej', f: 'brutto − składki społeczne', v: pln(r.podstawaZdrow) },
        { k: 'Składka zdrowotna', f: pln(P('zdrow')) + '% z podstawy', v: '− ' + pln(r.zdrowotna), tone: 'minus' },
        r.ppkPrac ? { k: 'PPK pracownika', v: '− ' + pln(r.ppkPrac), tone: 'minus' } : null,
        { k: 'Koszty uzyskania przychodu', v: pln(r.kup) },
        r.zwolnione ? { k: 'Przychód zwolniony z podatku', f: 'ulga do ' + pln(P('mlodzi'), 0) + ' zł rocznie', v: pln(r.zwolnione) } : null,
        { k: 'Podstawa opodatkowania', f: 'po zaokrągleniu do pełnych złotych', v: pln(r.podstawaPIT, 0) },
        { k: 'Podatek wg skali', f: r.wProgu2 ? 'część w progu 32%' : pln(P('pit1')) + '%', v: pln(r.podatekWstepny) },
        r.zmniejszajaca ? { k: 'Kwota zmniejszająca', v: '− ' + pln(r.zmniejszajaca), tone: 'minus' } : null,
        { k: 'Zaliczka na podatek', f: 'po zaokrągleniu do pełnych złotych', v: '− ' + pln(r.zaliczka, 0), tone: 'minus' },
        { k: 'Do wypłaty', v: pln(r.netto) + ' zł', tone: 'sum' }
      ], 'Po stronie pracownika')}
      ${steps([
        { k: 'Emerytalna', f: pln(P('emeF')) + '%', v: pln(r.emerytalnaF) },
        { k: 'Rentowa', f: pln(P('renF')) + '%', v: pln(r.rentowaF) },
        { k: 'Wypadkowa', f: pln(num(v.wyp) || P('wyp')) + '%', v: pln(r.wypadkowaF) },
        { k: 'Fundusz Pracy', f: pln(P('fp')) + '%', v: pln(r.fpF) },
        { k: 'FGŚP', f: pln(P('fgsp')) + '%', v: pln(r.fgspF) },
        r.ppkFirma ? { k: 'PPK pracodawcy', v: pln(r.ppkFirma) } : null,
        { k: 'Razem koszt', f: 'brutto + składki pracodawcy', v: pln(r.koszt) + ' zł', tone: 'sum' }
      ], 'Po stronie pracodawcy')}
      ${r.limitOsiagniety ? banner('Podstawa przekroczyła roczny limit 30-krotności — składki emerytalna i rentowa naliczone tylko do limitu.', 'warn') : ''}
      <div class="btnrow">
        <button class="btn ghost sm" data-act="copy-out">Kopiuj rozbicie</button>
        <button class="btn ghost sm" data-act="ksieguj-place">Zaksięguj listę płac</button>
      </div>
      ${note('Do ZUS-u idzie łącznie ' + pln(r.doZus) + ' zł, do urzędu skarbowego ' + pln(r.zaliczka, 0) + ' zł.')}`;
  }
};
let lastUoP = null;

const T_ZLECENIE = {
  id: 'zlecenie', n: 'Umowa zlecenie', d: 'Ze składkami, bez nich albo dla ucznia',
  i: '<path d="M14.5 3.5 20 9M4 20l1-4.5 9.5-9.5 4 4L9 19.5 4 20Z"/>',
  def: { kwota: '3000', tryb: 'pelne', kup: '20', pit2: false, chorobowa: true },
  form(v) {
    return `
      ${field('kwota', 'Kwota brutto umowy', { value: v.kwota, suffix: 'zł' })}
      ${select('tryb', 'Ubezpieczenia', [
        { v: 'pelne', l: 'pełne — emerytalna, rentowa, chorobowa, zdrowotna' },
        { v: 'bezChor', l: 'bez chorobowej' },
        { v: 'tylkoZdrow', l: 'tylko zdrowotna (inny tytuł do ZUS)' },
        { v: 'student', l: 'uczeń lub student do 26 lat — bez składek' },
        { v: 'maly', l: 'drobna umowa do 200 zł — podatek ryczałtowy' }], v.tryb)}
      ${v.tryb !== 'maly' ? seg('kup', [{ v: '20', l: 'koszty 20%' }, { v: '50', l: 'koszty 50%' }, { v: '0', l: 'bez kosztów' }], v.kup) : ''}
      ${v.tryb === 'pelne' ? toggle('chorobowa', 'Składka chorobowa', 'przy zleceniu jest dobrowolna', v.chorobowa) : ''}
      ${v.tryb !== 'maly' && v.tryb !== 'student' ? toggle('pit2', 'Oświadczenie PIT-2', 'zleceniobiorca może je złożyć', v.pit2) : ''}`;
  },
  out(v) {
    const r = calcZlecenie({ brutto: num(v.kwota), tryb: v.tryb, kupProc: num(v.kup), pit2: v.pit2, chorobowa: v.chorobowa });
    lastOut = r;
    if (r.ryczalt) return `
      ${result('Na rękę', pln(r.netto) + ' zł', 'drobna umowa — podatek zryczałtowany, bez kosztów uzyskania', 'good')}
      ${steps([
        { k: 'Kwota brutto', v: pln(r.brutto) },
        { k: 'Podatek zryczałtowany', f: pln(P('pit1')) + '% z kwoty umowy', v: '− ' + pln(r.zaliczka, 0), tone: 'minus' },
        { k: 'Do wypłaty', v: pln(r.netto) + ' zł', tone: 'sum' }
      ])}
      ${note('Ryczałt stosuje się, gdy kwota jednej umowy nie przekracza 200 zł, a zleceniobiorca nie jest pracownikiem zleceniodawcy.')}`;
    return `
      <div class="outgrid">
        ${result('Na rękę', pln(r.netto) + ' zł', '', 'good')}
        ${result('Koszt zleceniodawcy', pln(r.koszt) + ' zł')}
      </div>
      ${steps([
        { k: 'Kwota brutto', v: pln(r.brutto) },
        r.emerytalna ? { k: 'Emerytalna', f: pln(P('emeP')) + '%', v: '− ' + pln(r.emerytalna), tone: 'minus' } : null,
        r.rentowa ? { k: 'Rentowa', f: pln(P('renP')) + '%', v: '− ' + pln(r.rentowa), tone: 'minus' } : null,
        r.chorobowaS ? { k: 'Chorobowa', f: pln(P('chor')) + '%', v: '− ' + pln(r.chorobowaS), tone: 'minus' } : null,
        r.zdrowotna ? { k: 'Zdrowotna', f: pln(P('zdrow')) + '% z podstawy ' + pln(r.podstawaZdrow), v: '− ' + pln(r.zdrowotna), tone: 'minus' } : null,
        { k: 'Koszty uzyskania', f: r.kupProc + '% z ' + pln(r.podstawaZdrow), v: pln(r.kup) },
        { k: 'Podstawa opodatkowania', v: pln(r.podstawaPIT, 0) },
        r.zwolniony ? { k: 'Zwolnienie z podatku', f: r.student ? 'uczeń lub student do 26 lat' : 'ulga dla młodych', v: '—' } : null,
        { k: 'Zaliczka na podatek', v: '− ' + pln(r.zaliczka, 0), tone: 'minus' },
        { k: 'Do wypłaty', v: pln(r.netto) + ' zł', tone: 'sum' }
      ])}
      <button class="btn wide ghost sm" data-act="copy-out">Kopiuj rozbicie</button>`;
  }
};

const T_DZIELO = {
  id: 'dzielo', n: 'Umowa o dzieło', d: 'Koszty 20% albo 50% przy prawach autorskich',
  i: '<path d="M4 19.5V6a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M9 8h6"/>',
  def: { kwota: '4000', kup: '20', kupRok: '' },
  form(v) {
    return `
      ${field('kwota', 'Kwota brutto', { value: v.kwota, suffix: 'zł' })}
      ${seg('kup', [{ v: '20', l: 'koszty 20%' }, { v: '50', l: 'koszty 50%' }, { v: '0', l: 'bez kosztów' }], v.kup)}
      ${v.kup === '50' ? field('kupRok', 'Koszty 50% wykorzystane w tym roku', { value: v.kupRok, placeholder: '0',
        hint: 'limit ' + pln(P('prog') / 2, 0) + ' zł', suffix: 'zł' }) : ''}`;
  },
  out(v) {
    const r = calcDzielo({ brutto: num(v.kwota), kupProc: num(v.kup), kupRok: num(v.kupRok) });
    lastOut = r;
    return `
      ${result('Na rękę', pln(r.netto) + ' zł', 'bez składek ZUS — umowa o dzieło im nie podlega', 'good')}
      ${steps([
        { k: 'Kwota brutto', v: pln(r.brutto) },
        { k: 'Koszty uzyskania', f: r.kupProc + '% z kwoty brutto', v: pln(r.kup) },
        { k: 'Podstawa opodatkowania', v: pln(r.podstawaPIT, 0) },
        { k: 'Zaliczka na podatek', f: pln(P('pit1')) + '%', v: '− ' + pln(r.zaliczka, 0), tone: 'minus' },
        { k: 'Do wypłaty', v: pln(r.netto) + ' zł', tone: 'sum' }
      ])}
      ${r.limitPrzekroczony ? banner('Limit kosztów 50% został wyczerpany — nadwyżka liczona bez kosztów.', 'warn') : ''}
      <button class="btn wide ghost sm" data-act="copy-out">Kopiuj rozbicie</button>`;
  }
};

const T_POROWNAJ = {
  id: 'porownaj', n: 'Porównaj umowy', d: 'Ta sama kwota jako etat, zlecenie i dzieło',
  i: '<path d="M4 18V9M10 18V5M16 18v-6M20 18h-1"/>',
  def: { kwota: '5000' },
  form(v) { return field('kwota', 'Kwota brutto', { value: v.kwota, suffix: 'zł' }); },
  out(v) {
    const b = num(v.kwota);
    const wiersze = [
      { n: 'Umowa o pracę', r: calcUoP({ brutto: b, kup: P('kup'), pit2: true, chorobowa: true }) },
      { n: 'Zlecenie — pełne składki', r: calcZlecenie({ brutto: b, tryb: 'pelne', kupProc: 20 }) },
      { n: 'Zlecenie — student', r: calcZlecenie({ brutto: b, tryb: 'student', kupProc: 20 }) },
      { n: 'Umowa o dzieło', r: calcDzielo({ brutto: b, kupProc: 20 }) }
    ];
    const max = Math.max.apply(null, wiersze.map(w => w.r.netto));
    return `
      <div class="glass pane">
        <div class="tablewrap"><table class="data">
          <thead><tr><th>Forma</th><th class="n">Na rękę</th><th class="n">Koszt</th><th class="n">Obciążenia</th></tr></thead>
          <tbody>${wiersze.map(w => `<tr${w.r.netto === max ? ' class="strong"' : ''}>
            <td class="name">${esc(w.n)}</td>
            <td class="n">${pln(w.r.netto)}</td>
            <td class="n">${pln(w.r.koszt)}</td>
            <td class="n">${pln(round2(w.r.koszt - w.r.netto))}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
      ${note('Przy tej samej kwocie brutto najwięcej na rękę zostaje z ' + esc(wiersze.find(w => w.r.netto === max).n.toLowerCase()) +
        '. Koszt to tyle, ile płaci zatrudniający — u dzieła i zlecenia studenta równa się kwocie brutto.')}`;
  }
};

/* ============================================================
   KADRY
   ============================================================ */

const T_URLOP = {
  id: 'urlop', n: 'Wymiar urlopu', d: '20 albo 26 dni, proporcjonalnie do etatu',
  i: '<path d="M8 3v4M16 3v4M3.5 9.5h17M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5Z"/>',
  def: { staz: '12', etatL: '1', etatM: '1', miesiace: '12' },
  form(v) {
    return `
      ${field('staz', 'Staż pracy razem z nauką', { value: v.staz, suffix: 'lat',
        hint: 'od 10 lat przysługuje 26 dni' })}
      <div class="two">
        ${field('etatL', 'Etat — licznik', { value: v.etatL })}
        ${field('etatM', 'Etat — mianownik', { value: v.etatM })}
      </div>
      ${field('miesiace', 'Miesiące zatrudnienia w roku', { value: v.miesiace, suffix: 'mies.' })}`;
  },
  out(v) {
    const r = calcUrlop({ staz: num(v.staz), etatL: num(v.etatL), etatM: num(v.etatM), miesiace: num(v.miesiace) });
    return `
      ${result('Wymiar urlopu', r.dni + ' ' + plural(r.dni, 'dzień', 'dni', 'dni'), pln(r.godziny, 0) + ' godzin')}
      ${steps([
        { k: 'Wymiar podstawowy', f: num(v.staz) >= 10 ? 'staż od 10 lat' : 'staż poniżej 10 lat', v: r.bazowy + ' dni' },
        { k: 'Wymiar etatu', v: pln(r.etat * 100, 0) + '%' },
        { k: 'Okres zatrudnienia', v: r.miesiace + '/12' },
        { k: 'Wyliczenie', f: `${r.bazowy} × ${pln(r.etat, 2)} × ${r.miesiace}/12`, v: pln(r.proporcja) },
        { k: 'Po zaokrągleniu w górę', v: r.dni + ' ' + plural(r.dni, 'dzień', 'dni', 'dni'), tone: 'sum' }
      ])}
      ${note('Niepełny dzień urlopu zaokrągla się w górę do pełnego dnia. Przy niepełnym etacie dzień urlopu to tyle godzin, ile wynosi dobowa norma pracownika.')}`;
  }
};

const T_EKWIWALENT = {
  id: 'ekwiwalent', n: 'Ekwiwalent za urlop', d: 'Wypłata za niewykorzystane dni',
  i: '<path d="M12 3v18M8 7h6.5a2.5 2.5 0 0 1 0 5h-5a2.5 2.5 0 0 0 0 5H16"/>',
  def: { stale: '5000', zmienne: '', dni: '6', etatL: '1', etatM: '1', wsp: '' },
  form(v) {
    return `
      ${field('stale', 'Stałe składniki wynagrodzenia', { value: v.stale, suffix: 'zł', hint: 'z miesiąca nabycia prawa' })}
      ${field('zmienne', 'Zmienne składniki', { value: v.zmienne, placeholder: '0', suffix: 'zł',
        hint: 'średnia z 3 miesięcy' })}
      ${field('dni', 'Niewykorzystane dni urlopu', { value: v.dni, suffix: 'dni' })}
      <div class="two">
        ${field('etatL', 'Etat — licznik', { value: v.etatL })}
        ${field('etatM', 'Etat — mianownik', { value: v.etatM })}
      </div>
      ${field('wsp', 'Współczynnik', { value: v.wsp, placeholder: pln(P('wspEkw')), hint: 'na rok ' + S.year })}`;
  },
  out(v) {
    const r = calcEkwiwalent({ stale: num(v.stale), zmienne: num(v.zmienne), dni: num(v.dni),
      etatL: num(v.etatL), etatM: num(v.etatM), wsp: num(v.wsp) || P('wspEkw') });
    const w = wspolczynnikEkwiwalentu(num(S.year));
    return `
      ${result('Ekwiwalent', pln(r.kwota) + ' zł', `za ${num(v.dni)} ${plural(num(v.dni), 'dzień', 'dni', 'dni')} · ${pln(r.godziny, 0)} godzin`, 'good')}
      ${steps([
        { k: 'Podstawa ekwiwalentu', f: 'stałe + zmienne składniki', v: pln(r.podstawa) },
        { k: 'Współczynnik', f: `(${w.dni} − ${w.niedziele} niedziel − ${w.swieta} świąt − ${w.soboty} sobót) ÷ 12`, v: pln(r.wsp) },
        { k: 'Ekwiwalent za dzień', f: 'podstawa ÷ współczynnik', v: pln(r.zaDzien) },
        { k: 'Ekwiwalent za godzinę', f: 'za dzień ÷ dobowa norma', v: pln(r.zaGodzine) },
        { k: 'Godziny urlopu', f: 'dni × 8 × etat', v: pln(r.godziny, 0) },
        { k: 'Do wypłaty', v: pln(r.kwota) + ' zł', tone: 'sum' }
      ])}`;
  }
};

const T_CHOROBOWE = {
  id: 'chorobowe', n: 'Chorobowe', d: 'Wynagrodzenie za czas choroby i zasiłek',
  i: '<path d="M12 7v10M7 12h10"/><circle cx="12" cy="12" r="9"/>',
  def: { srednia: '5000', dni: '7', procent: '80' },
  form(v) {
    return `
      ${field('srednia', 'Średnie wynagrodzenie z 12 miesięcy', { value: v.srednia, suffix: 'zł' })}
      ${field('dni', 'Dni niezdolności do pracy', { value: v.dni, suffix: 'dni' })}
      ${seg('procent', [{ v: '80', l: '80%' }, { v: '100', l: '100%' }, { v: '70', l: '70% (szpital)' }], v.procent)}`;
  },
  out(v) {
    const r = calcChorobowe({ srednia: num(v.srednia), dni: num(v.dni), procent: num(v.procent) });
    return `
      ${result('Za czas choroby', pln(r.kwota) + ' zł', `${r.dni} ${plural(r.dni, 'dzień', 'dni', 'dni')} po ${pln(r.stawka)} zł`)}
      ${steps([
        { k: 'Średnie wynagrodzenie', v: pln(r.srednia) },
        { k: 'Potrącenie składek', f: pln(P('chorBase')) + '% — emerytalna, rentowa, chorobowa', v: '− ' + pln(r.potracenie), tone: 'minus' },
        { k: 'Podstawa wymiaru', v: pln(r.podstawa) },
        { k: 'Podstawa za jeden dzień', f: 'podstawa ÷ 30', v: pln(r.zaDzien) },
        { k: 'Stawka dzienna', f: r.proc + '% podstawy dziennej', v: pln(r.stawka) },
        { k: 'Razem', f: `${pln(r.stawka)} × ${r.dni}`, v: pln(r.kwota) + ' zł', tone: 'sum' }
      ])}
      ${note('Pierwsze ' + pln(P('chorDni'), 0) + ' dni choroby w roku pokrywa pracodawca (14 dni po ukończeniu 50 lat), dalej płaci ZUS jako zasiłek chorobowy.')}`;
  }
};

const T_NADGODZINY = {
  id: 'nadgodziny', n: 'Nadgodziny', d: 'Dodatki 50%, 100% i za pracę w nocy',
  i: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  def: { brutto: '5000', rok: String(TODAY.getFullYear()), miesiac: String(TODAY.getMonth()), g50: '8', g100: '0', gnoc: '0' },
  form(v) {
    return `
      ${field('brutto', 'Wynagrodzenie zasadnicze', { value: v.brutto, suffix: 'zł' })}
      <div class="two">
        ${select('miesiac', 'Miesiąc', MONTHS.map((m, idx) => ({ v: String(idx), l: m })), v.miesiac)}
        ${field('rok', 'Rok', { value: v.rok })}
      </div>
      <div class="three">
        ${field('g50', 'Godziny +50%', { value: v.g50, suffix: 'h' })}
        ${field('g100', 'Godziny +100%', { value: v.g100, suffix: 'h' })}
        ${field('gnoc', 'Godziny nocne', { value: v.gnoc, suffix: 'h' })}
      </div>`;
  },
  out(v) {
    const r = calcNadgodziny({ brutto: num(v.brutto), rok: num(v.rok), miesiac: num(v.miesiac),
      g50: num(v.g50), g100: num(v.g100), gnoc: num(v.gnoc) });
    return `
      ${result('Do dopłaty', pln(r.razem) + ' zł', `poza wynagrodzeniem zasadniczym`)}
      ${steps([
        { k: 'Wymiar czasu pracy', f: MONTHS[num(v.miesiac)] + ' ' + v.rok, v: r.wym.godziny + ' h' },
        { k: 'Stawka za godzinę', f: 'wynagrodzenie ÷ wymiar', v: pln(r.stawka) },
        { k: 'Normalne wynagrodzenie za nadgodziny', v: pln(r.normalne) },
        num(v.g50) ? { k: 'Dodatek 50%', f: `${pln(r.stawka)} × 50% × ${num(v.g50)} h`, v: pln(r.dod50), tone: 'plus' } : null,
        num(v.g100) ? { k: 'Dodatek 100%', f: `${pln(r.stawka)} × 100% × ${num(v.g100)} h`, v: pln(r.dod100), tone: 'plus' } : null,
        num(v.gnoc) ? { k: 'Dodatek nocny', f: `${pln(P('nocny'), 0)}% stawki z minimalnej — ${pln(r.stawkaNoc)} zł/h`, v: pln(r.dodNoc), tone: 'plus' } : null,
        { k: 'Razem', v: pln(r.razem) + ' zł', tone: 'sum' }
      ])}
      ${note('Dodatek 100% należy się za nadgodziny w nocy, w niedziele i święta niebędące dniami pracy oraz w dniu wolnym za pracę w niedzielę.')}`;
  }
};

const T_CZAS = {
  id: 'czas', n: 'Wymiar czasu pracy', d: 'Godziny i dni robocze w każdym miesiącu',
  i: '<path d="M4 5.5h16v15H4zM8 3v4M16 3v4M4 10h16"/>',
  def: { rok: String(TODAY.getFullYear()) },
  form(v) { return field('rok', 'Rok', { value: v.rok }); },
  out(v) {
    const y = num(v.rok) || TODAY.getFullYear();
    const mm = MONTHS.map((m, idx) => ({ m, idx, w: wymiarGodzin(y, idx) }));
    const razem = mm.reduce((s, x) => s + x.w.godziny, 0);
    const sw = holidays(y).filter(h => h.d.getDay() !== 0);
    return `
      ${result('Wymiar czasu pracy w ' + y + ' roku', razem + ' godzin', (razem / 8) + ' dni roboczych')}
      <div class="glass pane">
        <div class="tablewrap"><table class="data">
          <thead><tr><th>Miesiąc</th><th class="n">Godziny</th><th class="n">Dni</th><th class="n">Święta</th></tr></thead>
          <tbody>${mm.map(x => `<tr${x.idx === TODAY.getMonth() && y === TODAY.getFullYear() ? ' class="strong"' : ''}>
            <td class="name">${x.m}</td><td class="n">${x.w.godziny}</td><td class="n">${x.w.dni}</td>
            <td class="n">${x.w.swieta || '—'}</td></tr>`).join('')}
          <tr class="total"><td>Razem</td><td class="n">${razem}</td><td class="n">${razem / 8}</td><td class="n">${sw.length}</td></tr></tbody>
        </table></div>
      </div>
      <div class="glass pane">
        <div class="eyebrow" style="margin-bottom:8px">Święta w dniu innym niż niedziela</div>
        ${sw.map(h => `<div class="kv"><span class="k">${esc(h.n)}</span>
          <span class="v">${h.d.getDate()} ${MONTHS_G[h.d.getMonth()]} · ${DAYS[h.d.getDay()]}</span></div>`).join('')}
      </div>
      ${note('Wymiar liczony według art. 130 Kodeksu pracy: 40 godzin × liczba tygodni + 8 godzin × dni wystające od poniedziałku do piątku − 8 godzin za każde święto przypadające w dniu innym niż niedziela.')}`;
  }
};

/* ============================================================
   FIRMA
   ============================================================ */

const T_ZUS = {
  id: 'zus', n: 'Składki ZUS', d: 'Ulga na start, preferencyjne, pełne',
  i: '<path d="M4 20v-1a5 5 0 0 1 5-5h2M15 4.5a3.2 3.2 0 1 1-4.6 2.6"/><path d="M13.5 14h6a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 12 19.5v-4a1.5 1.5 0 0 1 1.5-1.5Z"/>',
  def: { wariant: 'pelny', chorobowa: true, forma: 'skala', dochod: '10000', przychod: '', podstawa: '' },
  form(v) {
    return `
      ${select('wariant', 'Rodzaj składek', [
        { v: 'start', l: 'Ulga na start — pierwsze 6 miesięcy' },
        { v: 'pref', l: 'Preferencyjne — 24 miesiące, podstawa 30% minimalnej' },
        { v: 'maly', l: 'Mały ZUS Plus — podstawa od dochodu' },
        { v: 'pelny', l: 'Pełne składki — podstawa 60% przeciętnego' }], v.wariant)}
      ${v.wariant === 'maly' ? field('podstawa', 'Twoja podstawa wymiaru', { value: v.podstawa, suffix: 'zł',
        hint: 'od ' + pln(zusBasePref()) + ' do ' + pln(zusBaseFull()) }) : ''}
      ${select('forma', 'Forma opodatkowania', [
        { v: 'skala', l: 'skala podatkowa — zdrowotna 9% od dochodu' },
        { v: 'liniowy', l: 'podatek liniowy — zdrowotna ' + pln(P('zdrowLin'), 1) + '% od dochodu' },
        { v: 'ryczalt', l: 'ryczałt — zdrowotna od progu przychodu' }], v.forma)}
      ${v.forma === 'ryczalt'
        ? field('przychod', 'Przychód od początku roku', { value: v.przychod, suffix: 'zł' })
        : field('dochod', 'Dochód miesięczny', { value: v.dochod, suffix: 'zł' })}
      ${v.wariant !== 'start' ? toggle('chorobowa', 'Składka chorobowa', 'dobrowolna — bez niej nie ma zasiłku', v.chorobowa) : ''}`;
  },
  out(v) {
    const r = calcZusDG({ wariant: v.wariant, chorobowa: v.chorobowa, forma: v.forma,
      dochodM: num(v.dochod), przychodR: num(v.przychod), podstawa: num(v.podstawa) });
    return `
      <div class="outgrid">
        ${result('Składki miesięcznie', pln(r.razem) + ' zł')}
        ${result('Rocznie', pln(r.razem * 12) + ' zł')}
      </div>
      ${steps([
        v.wariant === 'start' ? { k: 'Ulga na start', f: 'przez 6 miesięcy tylko składka zdrowotna', v: '—' } : { k: 'Podstawa wymiaru', v: pln(r.podstawa) },
        r.emerytalna ? { k: 'Emerytalna', f: pln(P('emeP') + P('emeF')) + '%', v: pln(r.emerytalna) } : null,
        r.rentowa ? { k: 'Rentowa', f: pln(P('renP') + P('renF')) + '%', v: pln(r.rentowa) } : null,
        r.chorobowaS ? { k: 'Chorobowa', f: pln(P('chor')) + '%', v: pln(r.chorobowaS) } : null,
        r.wypadkowa ? { k: 'Wypadkowa', f: pln(P('wyp')) + '%', v: pln(r.wypadkowa) } : null,
        r.fp ? { k: 'Fundusz Pracy i FS', f: pln(P('fp')) + '%', v: pln(r.fp) } : null,
        r.spoleczne ? { k: 'Razem społeczne', v: pln(r.spoleczne) } : null,
        { k: 'Zdrowotna', f: v.forma === 'ryczalt' ? 'od ' + pln(r.zdrowBaza) + ' zł podstawy' : pln(v.forma === 'liniowy' ? P('zdrowLin') : P('zdrow')) + '% od dochodu', v: pln(r.zdrowotna) },
        { k: 'Do zapłaty', v: pln(r.razem) + ' zł', tone: 'sum' }
      ])}
      ${r.zdrowMin ? banner('Składka zdrowotna nie może być niższa niż ' + pln(zdrowMin()) + ' zł — tyle wynosi ' + pln(P('zdrow'), 0) + '% minimalnego wynagrodzenia.', 'warn') : ''}
      ${note('Preferencyjne składki przysługują przez 24 miesiące po uldze na start i nie obejmują Funduszu Pracy.')}`;
  }
};

const T_FORMY = {
  id: 'formy', n: 'Forma opodatkowania', d: 'Skala, liniowy i ryczałt obok siebie',
  i: '<path d="M4 19h16M7 19V9M12 19V5M17 19v-7"/>',
  def: { przychod: '200000', koszty: '60000', stawka: '12', zus: 'pelny', chorobowa: true },
  form(v) {
    return `
      ${field('przychod', 'Przychód roczny', { value: v.przychod, suffix: 'zł' })}
      ${field('koszty', 'Koszty roczne', { value: v.koszty, suffix: 'zł', hint: 'bez składek ZUS' })}
      ${select('stawka', 'Stawka ryczałtu', [17, 15, 14, 12.5, 12, 10, 8.5, 5.5, 3, 2]
        .map(s => ({ v: String(s), l: pln(s, 1) + '% — ' + stawkaOpis(s) })), v.stawka)}
      ${select('zus', 'Składki ZUS', [
        { v: 'pelny', l: 'pełne' }, { v: 'pref', l: 'preferencyjne' }, { v: 'start', l: 'ulga na start' }], v.zus)}
      ${toggle('chorobowa', 'Składka chorobowa', '', v.chorobowa)}`;
  },
  out(v) {
    const i = { przychod: num(v.przychod), koszty: num(v.koszty), zusWariant: v.zus,
      chorobowa: v.chorobowa, stawkaRycz: num(v.stawka) };
    const w = [
      { n: 'Skala podatkowa', k: 'skala', r: calcForma('skala', i) },
      { n: 'Podatek liniowy', k: 'liniowy', r: calcForma('liniowy', i) },
      { n: 'Ryczałt ' + pln(num(v.stawka), 1) + '%', k: 'ryczalt', r: calcForma('ryczalt', i) }
    ];
    const best = w.reduce((a, b) => b.r.naRek > a.r.naRek ? b : a);
    return `
      ${result('Najwięcej zostaje przy formie', best.n, pln(best.r.naRek) + ' zł rocznie na rękę', 'good')}
      <div class="glass pane">
        <div class="tablewrap"><table class="data">
          <thead><tr><th>Forma</th><th class="n">Podatek</th><th class="n">Zdrowotna</th><th class="n">ZUS</th><th class="n">Zostaje</th></tr></thead>
          <tbody>${w.map(x => `<tr${x.k === best.k ? ' class="strong"' : ''}>
            <td class="name">${esc(x.n)}</td>
            <td class="n">${pln(x.r.podatek, 0)}</td>
            <td class="n">${pln(x.r.zdrowR, 0)}</td>
            <td class="n">${pln(x.r.spolR, 0)}</td>
            <td class="n">${pln(x.r.naRek, 0)}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
      ${steps(w.map(x => ({ k: x.n, f: 'obciążenia razem ' + pln(x.r.obciazenia, 0) + ' zł', v: pln(x.r.naRek, 0) + ' zł' })), 'Na rękę rocznie')}
      ${note('Ryczałt liczy się od przychodu — koszty nie mają znaczenia, dlatego opłaca się tam, gdzie kosztów jest mało. Na skali i liniowym podstawą jest dochód pomniejszony o zapłacone składki społeczne.')}`;
  }
};

function stawkaOpis(s) {
  return ({ 17: 'wolne zawody', 15: 'usługi pośrednictwa, reklama', 14: 'ochrona zdrowia, architektura',
    12.5: 'najem powyżej 100 tys.', 12: 'usługi IT', 10: 'sprzedaż nieruchomości',
    8.5: 'usługi, najem do 100 tys.', 5.5: 'budownictwo, transport', 3: 'handel, gastronomia', 2: 'sprzedaż produktów rolnych' })[s] || '';
}

const T_VAT = {
  id: 'vat', n: 'VAT', d: 'Netto, brutto i podatek w obie strony',
  i: '<path d="M4 15.5 15.5 4M8 4.5v.01M8 8.5A3.5 3.5 0 1 1 8 4a3.5 3.5 0 0 1 0 4.5ZM16 20a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"/>',
  def: { kwota: '1000', stawka: '23', kierunek: 'netto' },
  form(v) {
    return `
      ${seg('kierunek', [{ v: 'netto', l: 'Mam netto' }, { v: 'brutto', l: 'Mam brutto' }], v.kierunek)}
      ${field('kwota', v.kierunek === 'netto' ? 'Wartość netto' : 'Wartość brutto', { value: v.kwota, suffix: 'zł' })}
      ${seg('stawka', [{ v: '23', l: '23%' }, { v: '8', l: '8%' }, { v: '5', l: '5%' }, { v: '0', l: '0%' }], v.stawka)}`;
  },
  out(v) {
    const r = calcVat({ kwota: num(v.kwota), stawka: num(v.stawka), kierunek: v.kierunek });
    return `
      <div class="outgrid">
        ${result('Netto', pln(r.netto) + ' zł')}
        ${result('Brutto', pln(r.brutto) + ' zł')}
      </div>
      ${steps([
        { k: 'Wartość netto', v: pln(r.netto) },
        { k: 'VAT ' + pln(r.stawka, 0) + '%', f: v.kierunek === 'netto' ? 'netto × ' + pln(r.stawka, 0) + '%  („od stu")' : 'brutto × ' + pln(r.stawka, 0) + ' ÷ ' + pln(100 + r.stawka, 0) + '  („w stu")', v: pln(r.vat), tone: 'plus' },
        { k: 'Wartość brutto', v: pln(r.brutto) + ' zł', tone: 'sum' }
      ])}
      ${steps([
        { k: 'Na fakturze sprzedaży', f: 'wartość netto', v: 'Ma 730 · ' + pln(r.netto) },
        { k: 'VAT należny', v: 'Ma 221 · ' + pln(r.vat) },
        { k: 'Należność od odbiorcy', v: 'Wn 200 · ' + pln(r.brutto) }
      ], 'Jak to zaksięgować')}`;
  }
};

const T_LIMITY = {
  id: 'limity', n: 'Limity i progi', d: 'Ile wolno, zanim zmienią się obowiązki',
  i: '<path d="M12 3v18M5 8l7-5 7 5M5 8v8l7 5 7-5V8"/>',
  def: { kurs: '4.30' },
  form(v) {
    return `${field('kurs', 'Kurs euro do przeliczeń', { value: v.kurs, suffix: 'zł',
      hint: 'średni kurs NBP z 1. dnia roboczego października' })}`;
  },
  out(v) {
    const k = num(v.kurs) || 4.3;
    const eur = (e, opis) => ({ k: opis, f: pln(e, 0) + ' € × ' + pln(k) + ' zł', v: pln(e * k, 0) + ' zł' });
    return `
      ${steps([
        { k: 'Zwolnienie podmiotowe z VAT', f: 'wartość sprzedaży w roku', v: pln(P('vatLim'), 0) + ' zł' },
        eur(2000000, 'Mały podatnik VAT i PIT'),
        eur(2500000, 'Obowiązek prowadzenia ksiąg rachunkowych'),
        eur(2000000, 'Limit ryczałtu od przychodów ewidencjonowanych'),
        eur(50000, 'Jednorazowa amortyzacja — pomoc de minimis')
      ], 'Progi liczone w euro')}
      ${steps([
        { k: 'Próg podatkowy 32%', v: pln(P('prog'), 0) + ' zł' },
        { k: 'Kwota wolna od podatku', v: pln(P('wolna'), 0) + ' zł' },
        { k: 'Ulga dla młodych', v: pln(P('mlodzi'), 0) + ' zł' },
        { k: 'Limit 30-krotności składek', v: pln(P('limit30'), 0) + ' zł' },
        { k: 'Danina solidarnościowa powyżej', v: pln(P('danina'), 0) + ' zł' },
        { k: 'Środek trwały — wartość od', v: '10 000 zł' },
        { k: 'Pierwszy próg zdrowotnej na ryczałcie', v: pln(P('ryczP1'), 0) + ' zł' },
        { k: 'Drugi próg zdrowotnej na ryczałcie', v: pln(P('ryczP2'), 0) + ' zł' }
      ], 'Progi w złotych')}
      ${note('Progi w euro przelicza się po średnim kursie NBP z pierwszego dnia roboczego października roku poprzedniego, w zaokrągleniu do 1000 zł. Wpisz kurs z tabeli, jeśli liczysz na konkretny rok.')}`;
  }
};

/* ============================================================
   NARZĘDZIA
   ============================================================ */

const T_ODSETKI = {
  id: 'odsetki', n: 'Odsetki', d: 'Podatkowe, ustawowe i za opóźnienie w zapłacie',
  i: '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5h.01M14.5 14.5h.01M9 15l6-6"/>',
  def: { kwota: '10000', od: '', do: '', rodzaj: 'podatkowe', wlasna: '', kurs: '4.30' },
  form(v) {
    return `
      ${field('kwota', 'Kwota zaległości', { value: v.kwota, suffix: 'zł' })}
      <div class="two">
        ${field('od', 'Termin płatności', { value: v.od || addDays(ymd(TODAY), -30), type: 'date' })}
        ${field('do', 'Dzień zapłaty', { value: v.do || ymd(TODAY), type: 'date' })}
      </div>
      ${select('rodzaj', 'Rodzaj odsetek', [
        { v: 'podatkowe', l: 'podatkowe od zaległości — ' + pln(odsPodatkowe()) + '%' },
        { v: 'obnizone', l: 'obniżone podatkowe (50%) — ' + pln(odsPodatkowe() / 2) + '%' },
        { v: 'opoznienie', l: 'ustawowe za opóźnienie — ' + pln(odsOpoznienie()) + '%' },
        { v: 'kapitalowe', l: 'ustawowe kapitałowe — ' + pln(odsUstawowe()) + '%' },
        { v: 'wlasna', l: 'własna stawka' }], v.rodzaj)}
      ${v.rodzaj === 'wlasna' ? field('wlasna', 'Stawka roczna', { value: v.wlasna, suffix: '%' }) : ''}`;
  },
  out(v) {
    const stawki = { podatkowe: odsPodatkowe(), obnizone: round2(odsPodatkowe() / 2),
      opoznienie: odsOpoznienie(), kapitalowe: odsUstawowe(), wlasna: num(v.wlasna) };
    const stawka = stawki[v.rodzaj];
    const od = v.od || addDays(ymd(TODAY), -30), doD = v.do || ymd(TODAY);
    const r = calcOdsetki({ kwota: num(v.kwota), od, do: doD, stawka,
      rodzaj: v.rodzaj === 'podatkowe' || v.rodzaj === 'obnizone' ? 'podatkowe' : 'cywilne' });
    const k = num(v.kurs) || 4.3;
    const rek = r.kwota <= 5000 ? 40 : r.kwota <= 50000 ? 70 : 100;
    return `
      ${result('Odsetki', pln(r.odsetki, r.rodzaj === 'podatkowe' ? 0 : 2) + ' zł',
        `${r.dni} ${plural(r.dni, 'dzień', 'dni', 'dni')} zwłoki · razem do zapłaty ${pln(r.razem)} zł`)}
      ${steps([
        { k: 'Kwota zaległości', v: pln(r.kwota) },
        { k: 'Liczba dni', f: fmtDate(od) + ' → ' + fmtDate(doD), v: r.dni },
        { k: 'Stawka roczna', v: pln(stawka) + '%' },
        { k: 'Wyliczenie', f: `${pln(r.kwota)} × ${pln(stawka)}% × ${r.dni} ÷ 365`, v: pln(r.surowe) },
        { k: 'Odsetki', f: r.rodzaj === 'podatkowe' ? 'zaokrąglone do pełnych złotych' : 'w groszach', v: pln(r.odsetki, r.rodzaj === 'podatkowe' ? 0 : 2), tone: 'sum' }
      ])}
      ${r.ponizejProgu ? banner('Odsetki nie przekraczają ' + pln(P('odsProg')) + ' zł, więc nie wpłaca się ich do urzędu.', 'ok') : ''}
      ${v.rodzaj === 'opoznienie' ? steps([
        { k: 'Rekompensata za koszty odzyskiwania', f: 'kwota ' + (r.kwota <= 5000 ? 'do 5 000 zł' : r.kwota <= 50000 ? '5 000 – 50 000 zł' : 'powyżej 50 000 zł'), v: pln(rek, 0) + ' €' },
        { k: 'Po kursie ' + pln(k) + ' zł', v: pln(rek * k) + ' zł', tone: 'sum' }
      ], 'Transakcje handlowe') : ''}
      ${note('Odsetki podatkowe to dwukrotność stopy lombardowej powiększona o 2 punkty, nie mniej niż ' + pln(P('odsMin'), 0) + '%. Ustawowe liczy się od stopy referencyjnej NBP.')}`;
  }
};

const T_TERMINY = {
  id: 'terminy', n: 'Terminy i dni robocze', d: 'Kiedy mija termin i ile dni zostało',
  i: '<path d="M12 7.5V12l3 1.5M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z"/>',
  def: { od: '', dni: '14', mies: String(TODAY.getMonth()), rok: String(TODAY.getFullYear()) },
  form(v) {
    return `
      ${field('od', 'Data zdarzenia', { value: v.od || ymd(TODAY), type: 'date' })}
      ${field('dni', 'Termin', { value: v.dni, suffix: 'dni' })}
      <div class="two">
        ${select('mies', 'Miesiąc rozliczeniowy', MONTHS.map((m, i) => ({ v: String(i), l: m })), v.mies)}
        ${field('rok', 'Rok', { value: v.rok })}
      </div>`;
  },
  out(v) {
    const od = v.od || ymd(TODAY);
    const termin = addDays(od, num(v.dni));
    const przesuniety = nextWorkday(termin);
    const zostalo = daysBetween(ymd(TODAY), przesuniety);
    const y = num(v.rok), m = num(v.mies);
    const nast = m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 };
    const dzien = d => nextWorkday(ymd(new Date(nast.y, nast.m, d)));
    const wym = wymiarGodzin(y, m);
    const pierwszy = ymd(new Date(y, m, 1)), ostatni = ymd(new Date(y, m + 1, 0));
    return `
      ${result('Termin mija', fmtDate(przesuniety),
        (przesuniety !== termin ? 'wyliczony ' + fmtDate(termin) + ' wypada w dniu wolnym, więc przechodzi na najbliższy dzień roboczy · ' : '') +
        (zostalo > 0 ? 'zostało ' + zostalo + ' ' + plural(zostalo, 'dzień', 'dni', 'dni') : zostalo === 0 ? 'to dzisiaj' : 'minął ' + (-zostalo) + ' ' + plural(-zostalo, 'dzień', 'dni', 'dni') + ' temu'),
        zostalo < 0 ? 'bad' : '')}
      ${steps([
        { k: 'Składki ZUS', f: 'do 20. dnia następnego miesiąca', v: shortDate(dzien(20)) },
        { k: 'Zaliczka na PIT', f: 'do 20. dnia następnego miesiąca', v: shortDate(dzien(20)) },
        { k: 'JPK_V7 i zapłata VAT', f: 'do 25. dnia następnego miesiąca', v: shortDate(dzien(25)) },
        { k: 'Zaliczka na CIT', f: 'do 20. dnia następnego miesiąca', v: shortDate(dzien(20)) }
      ], 'Terminy za ' + MONTHS[m] + ' ' + y)}
      ${steps([
        { k: 'Dni kalendarzowe', v: daysBetween(pierwszy, ostatni) + 1 },
        { k: 'Dni robocze', v: workdaysBetween(pierwszy, ostatni) },
        { k: 'Wymiar czasu pracy', v: wym.godziny + ' h' },
        { k: 'Święta w miesiącu', v: wym.swieta || '—' }
      ], MONTHS[m] + ' ' + y)}
      ${note('Termin, który wypada w sobotę, niedzielę lub święto, przechodzi na najbliższy dzień roboczy.')}`;
  }
};

const T_AMORTYZACJA = {
  id: 'amortyzacja', n: 'Amortyzacja', d: 'Liniowa, degresywna i jednorazowa',
  i: '<path d="M4 6h16v12H4zM4 10h16M9 14h6"/>',
  def: { wartosc: '60000', stawka: '20', metoda: 'liniowa', wsp: '2' },
  form(v) {
    return `
      ${field('wartosc', 'Wartość początkowa', { value: v.wartosc, suffix: 'zł' })}
      ${field('stawka', 'Roczna stawka amortyzacji', { value: v.stawka, suffix: '%',
        hint: 'z wykazu stawek — np. 20% dla samochodu, 10% dla maszyn' })}
      ${seg('metoda', [{ v: 'liniowa', l: 'Liniowa' }, { v: 'degresywna', l: 'Degresywna' }, { v: 'jednorazowa', l: 'Jednorazowa' }], v.metoda)}
      ${v.metoda === 'degresywna' ? field('wsp', 'Współczynnik', { value: v.wsp, hint: 'najczęściej 2,0' }) : ''}`;
  },
  out(v) {
    const r = calcAmortyzacja({ wartosc: num(v.wartosc), stawka: num(v.stawka), metoda: v.metoda, wsp: num(v.wsp) });
    if (!r.rows.length) return `<div class="glass pane"><div class="empty">Podaj wartość i stawkę.</div></div>`;
    return `
      <div class="outgrid">
        ${result('Odpis w pierwszym roku', pln(r.rows[0].odpis) + ' zł')}
        ${result('Miesięcznie', pln(r.rows[0].miesiecznie) + ' zł')}
      </div>
      <div class="glass pane">
        <div class="tablewrap"><table class="data">
          <thead><tr><th>Rok</th><th class="n">Podstawa</th><th class="n">Odpis</th><th class="n">Umorzenie</th><th class="n">Wartość netto</th></tr></thead>
          <tbody>${r.rows.map(x => `<tr><td class="name">${x.rok}</td><td class="n">${pln(x.podstawa)}</td>
            <td class="n">${pln(x.odpis)}</td><td class="n">${pln(x.umorzenie)}</td><td class="n">${pln(x.netto)}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
      ${steps([
        { k: 'Odpis amortyzacyjny', v: 'Wn 400 · ' + pln(r.rows[0].miesiecznie) },
        { k: 'Umorzenie środka trwałego', v: 'Ma 070 · ' + pln(r.rows[0].miesiecznie) }
      ], 'Księgowanie odpisu miesięcznego')}
      ${v.metoda === 'degresywna' ? note('Metoda degresywna: odpis liczy się od wartości netto pomnożonej przez stawkę i współczynnik. Gdy odpis degresywny spadnie poniżej liniowego, przechodzi się na metodę liniową.') : ''}`;
  }
};

const T_ROZCHOD = {
  id: 'rozchod', n: 'Rozchód materiałów', d: 'FIFO, LIFO i średnia ważona',
  i: '<path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5zM4 8.5 12 13l8-4.5M12 13v7"/>',
  def: { metoda: 'fifo', ruchy: [
    { typ: 'pz', ilosc: '100', cena: '10' },
    { typ: 'pz', ilosc: '100', cena: '12' },
    { typ: 'rw', ilosc: '150', cena: '' }] },
  sync(v) {
    (v.ruchy || []).forEach((r, i) => {
      if (v['r' + i + '-il'] !== undefined) r.ilosc = v['r' + i + '-il'];
      if (v['r' + i + '-c'] !== undefined) r.cena = v['r' + i + '-c'];
    });
  },
  form(v) {
    return `
      ${seg('metoda', [{ v: 'fifo', l: 'FIFO' }, { v: 'lifo', l: 'LIFO' }, { v: 'srednia', l: 'Średnia' }], v.metoda)}
      <div class="stack" style="margin-bottom:10px">${(v.ruchy || []).map((r, i) => `
        <div class="accrow" style="cursor:default;gap:7px">
          <button class="btn sm ghost" data-act="ruch-typ" data-i="${i}" style="flex:none;min-width:44px;color:var(--${r.typ === 'pz' ? 'good' : 'ma'})">${r.typ === 'pz' ? 'Pz' : 'Rw'}</button>
          <input data-f="r${i}-il" value="${esc(r.ilosc || '')}" inputmode="decimal" placeholder="ilość" style="flex:1;padding:8px 10px;font-size:13px">
          <input data-f="r${i}-c" value="${esc(r.cena || '')}" inputmode="decimal" placeholder="${r.typ === 'pz' ? 'cena' : '—'}" ${r.typ === 'rw' ? 'disabled' : ''} style="flex:1;padding:8px 10px;font-size:13px">
          <button class="btn sm ghost danger" data-act="del-ruch" data-i="${i}">×</button>
        </div>`).join('')}</div>
      <button class="btn wide ghost sm" data-act="add-ruch">+ Przyjęcie lub wydanie</button>`;
  },
  out(v) {
    const r = calcRozchod((v.ruchy || []).map(x => ({ typ: x.typ, ilosc: num(x.ilosc), cena: num(x.cena) })), v.metoda);
    const rw = r.log.filter(x => x.typ === 'rw');
    const nazwa = { fifo: 'FIFO — pierwsze przyszło, pierwsze wyszło', lifo: 'LIFO — ostatnie przyszło, pierwsze wyszło', srednia: 'Średnia ważona' }[v.metoda];
    return `
      <div class="outgrid">
        ${result('Wartość rozchodu', pln(rw.reduce((s, x) => s + x.wartosc, 0)) + ' zł')}
        ${result('Stan końcowy', pln(r.stan.wartosc) + ' zł', pln(r.stan.ilosc, 0) + ' szt. po ' + pln(r.stan.cena) + ' zł')}
      </div>
      <div class="glass pane">
        <div class="eyebrow" style="margin-bottom:8px">${esc(nazwa)}</div>
        <div class="tablewrap"><table class="data">
          <thead><tr><th>Lp</th><th>Operacja</th><th class="n">Ilość</th><th class="n">Cena</th><th class="n">Wartość</th><th class="n">Stan</th></tr></thead>
          <tbody>${r.log.map(x => `<tr>
            <td>${x.lp}</td>
            <td class="name">${x.typ === 'pz' ? 'Przyjęcie' : 'Wydanie'}
              ${x.skladniki && x.skladniki.length > 1 ? `<span class="ak">${x.skladniki.map(s => pln(s.ilosc, 0) + '×' + pln(s.cena)).join(' + ')}</span>` : ''}</td>
            <td class="n">${pln(x.ilosc, 0)}</td><td class="n">${pln(x.cena)}</td>
            <td class="n">${pln(x.wartosc)}</td><td class="n">${pln(x.stan.wartosc)}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
      ${r.log.some(x => x.brak) ? banner('W magazynie nie ma tylu sztuk, ile wydajesz — sprawdź ilości.', 'alert') : ''}
      ${note('Przy średniej ważonej cena przelicza się po każdym przyjęciu. Wybrana metoda musi być stosowana konsekwentnie przez cały rok obrotowy.')}`;
  }
};

const T_WSKAZNIKI = {
  id: 'wskazniki', n: 'Analiza wskaźnikowa', d: 'Płynność, rentowność, zadłużenie',
  i: '<path d="M4 19h16M7 16l3.5-4.5 3 2.5L18 8"/>',
  def: { ao: '120000', zapasy: '40000', gotowka: '25000', naleznosci: '45000', zobKr: '80000',
         zobOg: '140000', aktywa: '300000', at: '180000', kapital: '160000', przychody: '500000', zysk: '45000' },
  form(v) {
    return `
      <div class="two">
        ${field('aktywa', 'Aktywa ogółem', { value: v.aktywa, suffix: 'zł' })}
        ${field('at', 'Aktywa trwałe', { value: v.at, suffix: 'zł' })}
      </div>
      <div class="two">
        ${field('ao', 'Aktywa obrotowe', { value: v.ao, suffix: 'zł' })}
        ${field('zapasy', 'Zapasy', { value: v.zapasy, suffix: 'zł' })}
      </div>
      <div class="two">
        ${field('naleznosci', 'Należności', { value: v.naleznosci, suffix: 'zł' })}
        ${field('gotowka', 'Środki pieniężne', { value: v.gotowka, suffix: 'zł' })}
      </div>
      <div class="two">
        ${field('kapital', 'Kapitał własny', { value: v.kapital, suffix: 'zł' })}
        ${field('zobOg', 'Zobowiązania ogółem', { value: v.zobOg, suffix: 'zł' })}
      </div>
      <div class="two">
        ${field('zobKr', 'Zobowiązania krótkoterminowe', { value: v.zobKr, suffix: 'zł' })}
        ${field('przychody', 'Przychody ze sprzedaży', { value: v.przychody, suffix: 'zł' })}
      </div>
      ${field('zysk', 'Zysk netto', { value: v.zysk, suffix: 'zł' })}`;
  },
  out(v) {
    const g = calcWskazniki(v);
    return g.map(grp => steps(grp.w.map(w => ({
      k: w.n, f: w.f + (w.norm ? '  ·  norma ' + w.norm : ''),
      v: w.v === null ? '—' : pln(w.v) + (w.u || '')
    })), grp.g)).join('');
  }
};

const T_MARZA = {
  id: 'marza', n: 'Marża i narzut', d: 'Dwie różne liczby z tego samego zysku',
  i: '<path d="M6 18 18 6M8 8.5h.01M16 15.5h.01"/>',
  def: { zakup: '100', sprzedaz: '125' },
  form(v) {
    return `
      ${field('zakup', 'Cena zakupu', { value: v.zakup, suffix: 'zł' })}
      ${field('sprzedaz', 'Cena sprzedaży', { value: v.sprzedaz, suffix: 'zł' })}`;
  },
  out(v) {
    const r = calcMarza(v);
    return `
      <div class="outgrid">
        ${result('Marża', pln(r.marza) + '%', 'zysk ÷ cena sprzedaży')}
        ${result('Narzut', pln(r.narzut) + '%', 'zysk ÷ cena zakupu')}
      </div>
      ${steps([
        { k: 'Cena zakupu', v: pln(r.zakup) },
        { k: 'Cena sprzedaży', v: pln(r.sprzedaz) },
        { k: 'Zysk na jednostce', v: pln(r.zysk), tone: 'plus' },
        { k: 'Marża', f: `${pln(r.zysk)} ÷ ${pln(r.sprzedaz)}`, v: pln(r.marza) + '%' },
        { k: 'Narzut', f: `${pln(r.zysk)} ÷ ${pln(r.zakup)}`, v: pln(r.narzut) + '%', tone: 'sum' }
      ])}
      ${note('Marża liczy się od ceny sprzedaży, narzut od ceny zakupu — dlatego narzut zawsze wychodzi wyższy.')}`;
  }
};

/* ---------- rejestr ---------- */
const TOOLS = {
  place:     [T_UOP, T_ZLECENIE, T_DZIELO, T_POROWNAJ],
  kadry:     [T_URLOP, T_EKWIWALENT, T_CHOROBOWE, T_NADGODZINY, T_CZAS],
  firma:     [T_ZUS, T_FORMY, T_VAT, T_LIMITY],
  narzedzia: [T_ODSETKI, T_TERMINY, T_AMORTYZACJA, T_ROZCHOD, T_WSKAZNIKI, T_MARZA]
};
const ALL_TOOLS = {};
Object.values(TOOLS).forEach(list => list.forEach(t => { ALL_TOOLS[t.id] = t; }));
let lastOut = null;
