"use strict";
/* ============================================================
   Silnik wyliczeń: płace, ZUS, podatki, kadry, narzędzia.
   Same liczby — bez ani jednego odwołania do interfejsu, żeby
   dało się je sprawdzić osobno.
   ============================================================ */

/* ------------------------------------------------------------
   UMOWA O PRACĘ
   i: { brutto, kup, pit2, pit2Wariant, chorobowa, ppk, ppkPDod, ppkFDod,
        ulga, wypadkowa, fp, narastPodst, narastPrzych }
   ------------------------------------------------------------ */
function calcUoP(i) {
  const brutto = round2(num(i.brutto));
  const st = { brutto };

  /* Składki emerytalna i rentowa tylko do 30-krotności. */
  const limit = P('limit30');
  const juz = num(i.narastPodst);
  const doLimitu = round2(clamp(limit - juz, 0, brutto));
  st.limitOsiagniety = doLimitu < brutto;

  st.emerytalna = round2(doLimitu * P('emeP') / 100);
  st.rentowa    = round2(doLimitu * P('renP') / 100);
  st.chorobowaS = i.chorobowa === false ? 0 : round2(brutto * P('chor') / 100);
  st.spoleczne  = round2(st.emerytalna + st.rentowa + st.chorobowaS);

  st.podstawaZdrow = round2(brutto - st.spoleczne);
  st.zdrowotna = round2(st.podstawaZdrow * P('zdrow') / 100);

  st.ppkPrac  = i.ppk ? round2(brutto * (P('ppkP') + num(i.ppkPDod)) / 100) : 0;
  st.ppkFirma = i.ppk ? round2(brutto * (P('ppkF') + num(i.ppkFDod)) / 100) : 0;

  /* Wpłata pracodawcy do PPK jest przychodem pracownika. */
  st.przychodPIT = round2(brutto + st.ppkFirma);

  /* Zwolnienia (ulga dla młodych, na powrót, 4+, seniora) — limit roczny wspólny. */
  const limUlga = P('mlodzi');
  st.zwolnione = (i.ulga && i.ulga !== 'brak')
    ? round2(clamp(limUlga - num(i.narastPrzych), 0, st.przychodPIT)) : 0;
  st.opodatkowany = round2(st.przychodPIT - st.zwolnione);

  const udzial = st.przychodPIT > 0 ? st.opodatkowany / st.przychodPIT : 1;
  st.spoleczneOdlicz = round2(st.spoleczne * udzial);
  st.kup = st.opodatkowany > 0 ? round2(num(i.kup ?? P('kup'))) : 0;

  st.podstawaPIT = Math.max(0, round0(st.opodatkowany - st.spoleczneOdlicz - st.kup));

  /* Próg 32% liczony narastająco od początku roku. */
  const prog = P('prog'), dochodPrzed = num(i.narastDochod);
  const cz1 = clamp(prog - dochodPrzed, 0, st.podstawaPIT);
  const cz2 = st.podstawaPIT - cz1;
  st.wProgu2 = cz2 > 0;
  st.podatekWstepny = round2(cz1 * P('pit1') / 100 + cz2 * P('pit2') / 100);

  const dziel = { 1: 1, 2: 2, 3: 3 }[num(i.pit2Wariant) || 1] || 1;
  st.zmniejszajaca = i.pit2 === false ? 0 : round2(P('zmniej') / dziel);
  st.zaliczka = Math.max(0, round0(st.podatekWstepny - st.zmniejszajaca));

  st.netto = round2(brutto - st.spoleczne - st.zdrowotna - st.zaliczka - st.ppkPrac);

  /* Koszt pracodawcy. */
  st.emerytalnaF = round2(doLimitu * P('emeF') / 100);
  st.rentowaF    = round2(doLimitu * P('renF') / 100);
  st.wypadkowaF  = round2(brutto * num(i.wypadkowa ?? P('wyp')) / 100);
  st.fpF   = i.fp === false ? 0 : round2(brutto * P('fp') / 100);
  st.fgspF = i.fp === false ? 0 : round2(brutto * P('fgsp') / 100);
  st.skladkiF = round2(st.emerytalnaF + st.rentowaF + st.wypadkowaF + st.fpF + st.fgspF);
  st.koszt = round2(brutto + st.skladkiF + st.ppkFirma);

  st.doZus = round2(st.spoleczne + st.zdrowotna + st.skladkiF);
  st.klin = st.koszt > 0 ? round2((st.koszt - st.netto) / st.koszt * 100) : 0;
  return st;
}

/* Netto → brutto: szukanie połowieniem, bo wzoru wprost nie ma
   (zaokrąglenia podstawy i zaliczki do pełnych złotych). */
function bruttoZNetto(netto, i) {
  let lo = 0, hi = Math.max(1000, num(netto) * 2.5);
  for (let n = 0; n < 70; n++) {
    const mid = (lo + hi) / 2;
    const r = calcUoP(Object.assign({}, i, { brutto: mid }));
    if (r.netto < netto) lo = mid; else hi = mid;
  }
  return round2((lo + hi) / 2);
}
function kosztNaBrutto(koszt, i) {
  let lo = 0, hi = Math.max(1000, num(koszt));
  for (let n = 0; n < 70; n++) {
    const mid = (lo + hi) / 2;
    const r = calcUoP(Object.assign({}, i, { brutto: mid }));
    if (r.koszt < koszt) lo = mid; else hi = mid;
  }
  return round2((lo + hi) / 2);
}

/* ------------------------------------------------------------
   UMOWA ZLECENIE
   ------------------------------------------------------------ */
function calcZlecenie(i) {
  const brutto = round2(num(i.brutto));
  const st = { brutto };
  const tryb = i.tryb || 'pelne';      // pelne | bezChor | tylkoZdrow | student | maly

  if (tryb === 'maly') {               // umowa do 200 zł — podatek zryczałtowany
    st.ryczalt = true;
    st.spoleczne = 0; st.zdrowotna = 0; st.kup = 0;
    st.podstawaPIT = brutto;
    st.zaliczka = round0(brutto * P('pit1') / 100);
    st.netto = round2(brutto - st.zaliczka);
    return st;
  }

  const zSpol = tryb === 'pelne' || tryb === 'bezChor';
  st.emerytalna = zSpol ? round2(brutto * P('emeP') / 100) : 0;
  st.rentowa    = zSpol ? round2(brutto * P('renP') / 100) : 0;
  st.chorobowaS = tryb === 'pelne' && i.chorobowa !== false ? round2(brutto * P('chor') / 100) : 0;
  st.spoleczne  = round2(st.emerytalna + st.rentowa + st.chorobowaS);

  st.podstawaZdrow = round2(brutto - st.spoleczne);
  st.zdrowotna = tryb === 'student' ? 0 : round2(st.podstawaZdrow * P('zdrow') / 100);

  const kupProc = num(i.kupProc ?? 20);
  st.kupProc = kupProc;
  st.kup = round2(st.podstawaZdrow * kupProc / 100);

  st.student = tryb === 'student';
  st.zwolniony = st.student || i.ulga === 'mlodzi';
  st.podstawaPIT = st.zwolniony ? 0 : Math.max(0, round0(brutto - st.spoleczne - st.kup));
  st.podatek = round2(st.podstawaPIT * P('pit1') / 100);
  st.zmniejszajaca = i.pit2 ? round2(P('zmniej')) : 0;
  st.zaliczka = Math.max(0, round0(st.podatek - st.zmniejszajaca));

  st.netto = round2(brutto - st.spoleczne - st.zdrowotna - st.zaliczka);

  st.emerytalnaF = zSpol ? round2(brutto * P('emeF') / 100) : 0;
  st.rentowaF    = zSpol ? round2(brutto * P('renF') / 100) : 0;
  st.wypadkowaF  = zSpol ? round2(brutto * num(i.wypadkowa ?? P('wyp')) / 100) : 0;
  st.fpF   = zSpol && i.fp ? round2(brutto * P('fp') / 100) : 0;
  st.fgspF = zSpol && i.fp ? round2(brutto * P('fgsp') / 100) : 0;
  st.skladkiF = round2(st.emerytalnaF + st.rentowaF + st.wypadkowaF + st.fpF + st.fgspF);
  st.koszt = round2(brutto + st.skladkiF);
  return st;
}

/* ------------------------------------------------------------
   UMOWA O DZIEŁO — bez składek, koszty 20% albo 50%.
   ------------------------------------------------------------ */
function calcDzielo(i) {
  const brutto = round2(num(i.brutto));
  const st = { brutto };
  st.kupProc = num(i.kupProc ?? 20);
  st.kup = round2(brutto * st.kupProc / 100);
  /* Autorskie 50% tylko do połowy pierwszego progu skali. */
  st.limit50 = P('prog') / 2;
  if (st.kupProc === 50 && num(i.kupRok) + st.kup > st.limit50) {
    st.kup = round2(Math.max(0, st.limit50 - num(i.kupRok)));
    st.limitPrzekroczony = true;
  }
  st.podstawaPIT = Math.max(0, round0(brutto - st.kup));
  st.zaliczka = round0(st.podstawaPIT * P('pit1') / 100);
  st.netto = round2(brutto - st.zaliczka);
  st.koszt = brutto;
  return st;
}

/* ------------------------------------------------------------
   ZUS PRZEDSIĘBIORCY
   ------------------------------------------------------------ */
function calcZusDG(i) {
  const wariant = i.wariant || 'pelny';
  const st = { wariant };
  st.podstawa = wariant === 'pelny' ? zusBaseFull()
    : wariant === 'pref' ? zusBasePref()
    : wariant === 'maly' ? round2(num(i.podstawa))
    : 0;

  if (wariant === 'start') {
    st.emerytalna = st.rentowa = st.chorobowaS = st.wypadkowa = st.fp = 0;
  } else {
    st.emerytalna = round2(st.podstawa * (P('emeP') + P('emeF')) / 100);
    st.rentowa    = round2(st.podstawa * (P('renP') + P('renF')) / 100);
    st.chorobowaS = i.chorobowa ? round2(st.podstawa * P('chor') / 100) : 0;
    st.wypadkowa  = round2(st.podstawa * num(i.wypadkowa ?? P('wyp')) / 100);
    /* Fundusz Pracy tylko przy podstawie nie niższej niż minimalne wynagrodzenie. */
    st.fp = (wariant === 'pelny' && st.podstawa >= P('minWage')) ? round2(st.podstawa * P('fp') / 100) : 0;
  }
  st.spoleczne = round2(st.emerytalna + st.rentowa + st.chorobowaS + st.wypadkowa + st.fp);

  /* Zdrowotna zależy od formy opodatkowania. */
  const forma = i.forma || 'skala';
  const dochodM = round2(num(i.dochodM));
  const przychodR = round2(num(i.przychodR));
  if (forma === 'ryczalt') {
    const b = przychodR <= P('ryczP1') ? P('ryczB1') : przychodR <= P('ryczP2') ? P('ryczB2') : P('ryczB3');
    st.zdrowBaza = round2(P('avgWageQ4') * b / 100);
    st.zdrowotna = round2(st.zdrowBaza * P('zdrow') / 100);
  } else if (forma === 'karta') {
    st.zdrowBaza = P('minWage');
    st.zdrowotna = zdrowMin();
  } else {
    const stawka = forma === 'liniowy' ? P('zdrowLin') : P('zdrow');
    st.zdrowBaza = dochodM;
    st.zdrowotna = Math.max(zdrowMin(), round2(dochodM * stawka / 100));
    st.zdrowMin = st.zdrowotna === zdrowMin() && dochodM * stawka / 100 < zdrowMin();
  }
  st.razem = round2(st.spoleczne + st.zdrowotna);
  return st;
}

/* ------------------------------------------------------------
   FORMY OPODATKOWANIA — porównanie w skali roku.
   ------------------------------------------------------------ */
function calcForma(forma, i) {
  const przychod = round2(num(i.przychod));
  const koszty = round2(num(i.koszty));
  const zus = calcZusDG({ wariant: i.zusWariant, chorobowa: i.chorobowa, forma, przychodR: przychod });
  const spolR = round2(zus.spoleczne * 12);
  const st = { forma, przychod, koszty, spolR, zusM: zus };
  const dochod = round2(przychod - koszty - (i.zusWKoszty === false ? 0 : spolR));
  st.dochod = dochod;

  if (forma === 'ryczalt') {
    const stawka = num(i.stawkaRycz);
    st.stawka = stawka;
    const b = przychod <= P('ryczP1') ? P('ryczB1') : przychod <= P('ryczP2') ? P('ryczB2') : P('ryczB3');
    st.zdrowM = round2(P('avgWageQ4') * b / 100 * P('zdrow') / 100);
    st.zdrowR = round2(st.zdrowM * 12);
    /* Na ryczałcie odlicza się połowę zapłaconej składki zdrowotnej. */
    st.podstawa = Math.max(0, round0(przychod - spolR - st.zdrowR / 2));
    st.podatek = round0(st.podstawa * stawka / 100);
  } else if (forma === 'liniowy') {
    st.zdrowM = Math.max(zdrowMin(), round2(Math.max(0, dochod) / 12 * P('zdrowLin') / 100));
    st.zdrowR = round2(st.zdrowM * 12);
    st.odliczZdrow = Math.min(st.zdrowR, P('limLin'));
    st.podstawa = Math.max(0, round0(dochod - st.odliczZdrow));
    st.podatek = round0(st.podstawa * P('liniowa') / 100);
  } else {
    st.zdrowM = Math.max(zdrowMin(), round2(Math.max(0, dochod) / 12 * P('zdrow') / 100));
    st.zdrowR = round2(st.zdrowM * 12);
    st.podstawa = Math.max(0, round0(dochod));
    const prog = P('prog');
    const cz1 = Math.min(st.podstawa, prog), cz2 = Math.max(0, st.podstawa - prog);
    st.podatek = Math.max(0, round0(cz1 * P('pit1') / 100 + cz2 * P('pit2') / 100 - P('zmniej') * 12));
  }
  st.obciazenia = round2(spolR + st.zdrowR + st.podatek);
  st.naRek = round2(przychod - koszty - st.obciazenia);
  st.efekt = przychod > 0 ? round2(st.obciazenia / Math.max(1, przychod - koszty) * 100) : 0;
  return st;
}

/* ------------------------------------------------------------
   KADRY
   ------------------------------------------------------------ */
/* Wymiar czasu pracy w miesiącu (art. 130 Kodeksu pracy):
   40 h × pełne tygodnie + 8 h × dni wystające od pon do pt
   − 8 h × święta w dniu innym niż niedziela. */
function wymiarGodzin(y, m) {
  const dni = daysInMonth(y, m);
  const tygodnie = Math.floor(dni / 7);
  let godz = tygodnie * 40;
  const reszta = dni % 7;
  let wystajace = 0;
  for (let d = dni - reszta + 1; d <= dni; d++) {
    const dow = new Date(y, m, d).getDay();
    if (dow >= 1 && dow <= 5) wystajace++;
  }
  godz += wystajace * 8;
  let swieta = 0;
  holidays(y).forEach(h => {
    if (h.d.getMonth() === m && h.d.getDay() !== 0) swieta++;
  });
  return { godziny: godz - swieta * 8, dni: (godz - swieta * 8) / 8, tygodnie, wystajace, swieta };
}

/* Współczynnik ekwiwalentu: (365 − niedziele − święta − soboty) ÷ 12 */
function wspolczynnikEkwiwalentu(y) {
  const dni = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
  let niedziele = 0, soboty = 0;
  for (let m = 0; m < 12; m++) for (let d = 1; d <= daysInMonth(y, m); d++) {
    const dow = new Date(y, m, d).getDay();
    if (dow === 0) niedziele++;
    if (dow === 6) soboty++;
  }
  const swieta = holidays(y).filter(h => h.d.getDay() !== 0).length;
  const wolne = dni - niedziele - swieta - soboty;
  return { dni, niedziele, soboty, swieta, wolne, wsp: round2(wolne / 12) };
}

function calcUrlop(i) {
  const staz = num(i.staz);
  const bazowy = staz >= 10 ? P('urlop2') : P('urlop1');
  const etat = num(i.etatL) / Math.max(1, num(i.etatM));
  const miesiace = clamp(num(i.miesiace), 1, 12);
  const proporcja = bazowy * etat * miesiace / 12;
  const dni = Math.ceil(proporcja - 0.0001);
  return { bazowy, etat, miesiace, proporcja: round2(proporcja), dni, godziny: round2(dni * 8 * etat) };
}

function calcEkwiwalent(i) {
  const podstawa = round2(num(i.stale) + num(i.zmienne));
  const wsp = num(i.wsp || P('wspEkw'));
  const etat = num(i.etatL) / Math.max(1, num(i.etatM));
  const zaDzien = round2(podstawa / wsp);
  const zaGodzine = round2(zaDzien / (8 * etat || 8));
  const godziny = round2(num(i.dni) * 8 * etat);
  return { podstawa, wsp, zaDzien, zaGodzine, godziny, kwota: round2(zaGodzine * godziny) };
}

function calcChorobowe(i) {
  const srednia = round2(num(i.srednia));
  const potracenie = round2(srednia * P('chorBase') / 100);
  const podstawa = round2(srednia - potracenie);
  const zaDzien = round2(podstawa / 30);
  const proc = num(i.procent || P('chorPr'));
  const stawka = round2(zaDzien * proc / 100);
  const dni = num(i.dni);
  return { srednia, potracenie, podstawa, zaDzien, proc, stawka, dni, kwota: round2(stawka * dni) };
}

function calcNadgodziny(i) {
  const brutto = round2(num(i.brutto));
  const wym = wymiarGodzin(num(i.rok), num(i.miesiac));
  const stawka = round2(brutto / Math.max(1, wym.godziny));
  const g50 = num(i.g50), g100 = num(i.g100);
  const normalne = round2(stawka * (g50 + g100));
  const dod50 = round2(stawka * P('nadg50') / 100 * g50);
  const dod100 = round2(stawka * P('nadg100') / 100 * g100);
  const nocne = num(i.gnoc);
  const stawkaNoc = round2(P('minWage') / Math.max(1, wym.godziny) * P('nocny') / 100);
  const dodNoc = round2(stawkaNoc * nocne);
  return { wym, stawka, normalne, dod50, dod100, nocne, stawkaNoc, dodNoc,
           razem: round2(normalne + dod50 + dod100 + dodNoc) };
}

/* ------------------------------------------------------------
   NARZĘDZIA
   ------------------------------------------------------------ */
function calcVat(i) {
  const st = num(i.stawka);
  const kier = i.kierunek || 'netto';
  const k = num(i.kwota);
  let netto, vat, brutto;
  if (kier === 'netto') { netto = round2(k); vat = round2(netto * st / 100); brutto = round2(netto + vat); }
  else { brutto = round2(k); netto = round2(brutto / (1 + st / 100)); vat = round2(brutto - netto); }
  return { netto, vat, brutto, stawka: st };
}

function calcOdsetki(i) {
  const kwota = num(i.kwota);
  const dni = Math.max(0, daysBetween(i.od, i.do));
  const stawka = num(i.stawka);
  const surowe = kwota * stawka / 100 * dni / 365;
  const rodzaj = i.rodzaj || 'podatkowe';
  const odsetki = rodzaj === 'podatkowe' ? round0(surowe) : round2(surowe);
  return { kwota, dni, stawka, surowe: round2(surowe), odsetki, rodzaj,
           ponizejProgu: rodzaj === 'podatkowe' && surowe < P('odsProg'),
           razem: round2(kwota + odsetki) };
}

function calcAmortyzacja(i) {
  const wartosc = round2(num(i.wartosc));
  const stawka = num(i.stawka);
  const metoda = i.metoda || 'liniowa';
  const wsp = num(i.wsp || 2);
  const rows = [];
  let netto = wartosc, umorzenie = 0, rok = 1;
  const roczLin = round2(wartosc * stawka / 100);
  while (netto > 0.005 && rok <= 60) {
    let odpis;
    if (metoda === 'degresywna') {
      const deg = round2(netto * stawka * wsp / 100);
      odpis = deg > roczLin ? deg : roczLin;       // przejście na liniową
    } else if (metoda === 'jednorazowa') {
      odpis = wartosc;
    } else {
      odpis = roczLin;
    }
    if (odpis > netto) odpis = netto;
    umorzenie = round2(umorzenie + odpis);
    netto = round2(wartosc - umorzenie);
    rows.push({ rok, podstawa: metoda === 'degresywna' ? round2(netto + odpis) : wartosc, odpis, umorzenie, netto,
                miesiecznie: round2(odpis / 12) });
    rok++;
  }
  return { wartosc, stawka, metoda, rows, lat: rows.length };
}

/* Rozchód materiałów: FIFO, LIFO, średnia ważona. */
function calcRozchod(ruchy, metoda) {
  let partie = [];                     // [{ilosc, cena}]
  const log = [];
  ruchy.forEach((r, idx) => {
    const ilosc = num(r.ilosc), cena = num(r.cena);
    if (r.typ === 'pz') {
      if (metoda === 'srednia' && partie.length) {
        const st = partie[0];
        const nowaIlosc = round2(st.ilosc + ilosc);
        const nowaCena = round2((st.ilosc * st.cena + ilosc * cena) / Math.max(1e-9, nowaIlosc));
        partie = [{ ilosc: nowaIlosc, cena: nowaCena }];
      } else if (metoda === 'srednia') {
        partie = [{ ilosc, cena }];
      } else {
        partie.push({ ilosc, cena });
      }
      log.push({ lp: idx + 1, opis: r.opis || 'Przyjęcie', typ: 'pz', ilosc, cena,
                 wartosc: round2(ilosc * cena), stan: stanPartii(partie) });
    } else {
      let doWydania = ilosc, wartosc = 0, skladniki = [];
      while (doWydania > 0.0001 && partie.length) {
        const p = metoda === 'lifo' ? partie[partie.length - 1] : partie[0];
        const bierz = Math.min(p.ilosc, doWydania);
        wartosc = round2(wartosc + bierz * p.cena);
        skladniki.push({ ilosc: round2(bierz), cena: p.cena });
        p.ilosc = round2(p.ilosc - bierz);
        doWydania = round2(doWydania - bierz);
        if (p.ilosc <= 0.0001) { if (metoda === 'lifo') partie.pop(); else partie.shift(); }
      }
      log.push({ lp: idx + 1, opis: r.opis || 'Wydanie', typ: 'rw', ilosc, wartosc,
                 cena: ilosc ? round2(wartosc / ilosc) : 0, skladniki, stan: stanPartii(partie),
                 brak: doWydania > 0.0001 ? round2(doWydania) : 0 });
    }
  });
  return { log, stan: stanPartii(partie), partie };
}
function stanPartii(partie) {
  const ilosc = round2(partie.reduce((s, p) => s + p.ilosc, 0));
  const wartosc = round2(partie.reduce((s, p) => s + p.ilosc * p.cena, 0));
  return { ilosc, wartosc, cena: ilosc ? round2(wartosc / ilosc) : 0 };
}

function calcWskazniki(i) {
  const d = k => num(i[k]);
  const bez = (a, b) => b ? round2(a / b) : null;
  const proc = (a, b) => b ? round2(a / b * 100) : null;
  const zobKr = d('zobKr'), ao = d('ao'), zapasy = d('zapasy'), gotowka = d('gotowka');
  return [
    { g: 'Płynność', w: [
      { n: 'Płynność bieżąca (I stopnia)', v: bez(ao, zobKr), f: 'aktywa obrotowe ÷ zobowiązania krótkoterminowe', norm: '1,2 – 2,0' },
      { n: 'Płynność szybka (II stopnia)', v: bez(round2(ao - zapasy), zobKr), f: '(aktywa obrotowe − zapasy) ÷ zobowiązania krótkoterminowe', norm: '0,8 – 1,2' },
      { n: 'Płynność gotówkowa (III stopnia)', v: bez(gotowka, zobKr), f: 'środki pieniężne ÷ zobowiązania krótkoterminowe', norm: '0,1 – 0,2' }
    ]},
    { g: 'Rentowność', w: [
      { n: 'Rentowność sprzedaży ROS', v: proc(d('zysk'), d('przychody')), u: '%', f: 'zysk netto ÷ przychody ze sprzedaży', norm: 'im wyżej, tym lepiej' },
      { n: 'Rentowność aktywów ROA', v: proc(d('zysk'), d('aktywa')), u: '%', f: 'zysk netto ÷ aktywa ogółem' },
      { n: 'Rentowność kapitału własnego ROE', v: proc(d('zysk'), d('kapital')), u: '%', f: 'zysk netto ÷ kapitał własny' }
    ]},
    { g: 'Zadłużenie', w: [
      { n: 'Ogólne zadłużenie', v: proc(d('zobOg'), d('aktywa')), u: '%', f: 'zobowiązania ogółem ÷ aktywa ogółem', norm: 'do 67%' },
      { n: 'Zadłużenie kapitału własnego', v: bez(d('zobOg'), d('kapital')), f: 'zobowiązania ogółem ÷ kapitał własny' },
      { n: 'Pokrycie aktywów trwałych kapitałem własnym', v: proc(d('kapital'), d('at')), u: '%', f: 'kapitał własny ÷ aktywa trwałe', norm: 'powyżej 100%' }
    ]},
    { g: 'Sprawność', w: [
      { n: 'Rotacja zapasów w dniach', v: d('przychody') ? round2(zapasy / d('przychody') * 365) : null, u: 'dni', f: 'zapasy ÷ przychody × 365' },
      { n: 'Rotacja należności w dniach', v: d('przychody') ? round2(d('naleznosci') / d('przychody') * 365) : null, u: 'dni', f: 'należności ÷ przychody × 365' },
      { n: 'Rotacja zobowiązań w dniach', v: d('przychody') ? round2(zobKr / d('przychody') * 365) : null, u: 'dni', f: 'zobowiązania krótkoterminowe ÷ przychody × 365' }
    ]}
  ];
}

function calcMarza(i) {
  const zakup = num(i.zakup), sprzedaz = num(i.sprzedaz);
  const zysk = round2(sprzedaz - zakup);
  return { zakup, sprzedaz, zysk,
           marza: sprzedaz ? round2(zysk / sprzedaz * 100) : 0,
           narzut: zakup ? round2(zysk / zakup * 100) : 0 };
}
