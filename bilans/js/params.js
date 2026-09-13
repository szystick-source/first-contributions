"use strict";
/* ============================================================
   Parametry roku — stawki, progi i limity.
   Każda liczba jest tu widoczna i każdą da się poprawić. Przepisy
   zmieniają się częściej niż apka, a na lekcji zadanie bywa liczone
   na stawkach z polecenia, nie z Dziennika Ustaw.
   Pozycje z kropką: sprawdź, zanim oddasz wyliczenie.
   ============================================================ */

const YEARS = ['2026', '2025'];

/* d — wartość domyślna per rok, u — jednostka, check — wymaga sprawdzenia */
const PARAMS = [
  { g: 'Wynagrodzenia', items: [
    { k: 'minWage',   n: 'Minimalne wynagrodzenie',        u: 'zł',  d: { 2026: 4806, 2025: 4666 } },
    { k: 'minHour',   n: 'Minimalna stawka godzinowa',     u: 'zł',  d: { 2026: 31.40, 2025: 30.50 } },
    { k: 'avgWage',   n: 'Prognozowane przeciętne wynagrodzenie', u: 'zł', d: { 2026: 9420, 2025: 8673 },
      h: 'podstawa składek ZUS przedsiębiorcy i limitu 30-krotności', check: true },
    { k: 'avgWageQ4', n: 'Przeciętne wynagrodzenie w IV kw. roku poprzedniego', u: 'zł',
      d: { 2026: 9000, 2025: 8549.18 }, h: 'od tego liczy się zdrowotna na ryczałcie', check: true },
    { k: 'limit30',   n: 'Roczny limit podstawy emerytalno-rentowej (30-krotność)', u: 'zł',
      d: { 2026: 282600, 2025: 260190 }, check: true }
  ]},
  { g: 'Składki ZUS', items: [
    { k: 'emeP',  n: 'Emerytalna — pracownik',   u: '%', d: { 2026: 9.76, 2025: 9.76 } },
    { k: 'emeF',  n: 'Emerytalna — pracodawca',  u: '%', d: { 2026: 9.76, 2025: 9.76 } },
    { k: 'renP',  n: 'Rentowa — pracownik',      u: '%', d: { 2026: 1.5,  2025: 1.5 } },
    { k: 'renF',  n: 'Rentowa — pracodawca',     u: '%', d: { 2026: 6.5,  2025: 6.5 } },
    { k: 'chor',  n: 'Chorobowa',                u: '%', d: { 2026: 2.45, 2025: 2.45 } },
    { k: 'wyp',   n: 'Wypadkowa',                u: '%', d: { 2026: 1.67, 2025: 1.67 },
      h: 'stawka zależy od rodzaju działalności — tu wartość typowa' },
    { k: 'fp',    n: 'Fundusz Pracy i FS',       u: '%', d: { 2026: 2.45, 2025: 2.45 } },
    { k: 'fgsp',  n: 'FGŚP',                     u: '%', d: { 2026: 0.10, 2025: 0.10 } },
    { k: 'zdrow', n: 'Zdrowotna',                u: '%', d: { 2026: 9,    2025: 9 } },
    { k: 'chorBase', n: 'Suma składek pracownika (do podstawy chorobowego)', u: '%',
      d: { 2026: 13.71, 2025: 13.71 }, h: '9,76 + 1,5 + 2,45' }
  ]},
  { g: 'Podatek dochodowy', items: [
    { k: 'pit1',    n: 'Pierwsza stawka skali',        u: '%',  d: { 2026: 12, 2025: 12 } },
    { k: 'pit2',    n: 'Druga stawka skali',           u: '%',  d: { 2026: 32, 2025: 32 } },
    { k: 'prog',    n: 'Próg podatkowy',               u: 'zł', d: { 2026: 120000, 2025: 120000 } },
    { k: 'wolna',   n: 'Kwota wolna',                  u: 'zł', d: { 2026: 30000, 2025: 30000 } },
    { k: 'zmniej',  n: 'Kwota zmniejszająca — miesięcznie', u: 'zł', d: { 2026: 300, 2025: 300 },
      h: 'przy PIT-2 w wariancie 1/12' },
    { k: 'kup',     n: 'Koszty uzyskania — podstawowe', u: 'zł', d: { 2026: 250, 2025: 250 } },
    { k: 'kupP',    n: 'Koszty uzyskania — podwyższone', u: 'zł', d: { 2026: 300, 2025: 300 } },
    { k: 'mlodzi',  n: 'Limit ulgi dla młodych',       u: 'zł', d: { 2026: 85528, 2025: 85528 } },
    { k: 'liniowa', n: 'Podatek liniowy',              u: '%',  d: { 2026: 19, 2025: 19 } },
    { k: 'zdrowLin',n: 'Zdrowotna — podatek liniowy',  u: '%',  d: { 2026: 4.9, 2025: 4.9 } },
    { k: 'limLin',  n: 'Limit odliczenia zdrowotnej (liniowy)', u: 'zł',
      d: { 2026: 13300, 2025: 12900 }, check: true },
    { k: 'danina',  n: 'Próg daniny solidarnościowej', u: 'zł', d: { 2026: 1000000, 2025: 1000000 } },
    { k: 'daninaSt',n: 'Danina solidarnościowa',       u: '%',  d: { 2026: 4, 2025: 4 } }
  ]},
  { g: 'Ryczałt od przychodów', items: [
    { k: 'ryczP1', n: 'Pierwszy próg przychodu',  u: 'zł', d: { 2026: 60000, 2025: 60000 } },
    { k: 'ryczP2', n: 'Drugi próg przychodu',     u: 'zł', d: { 2026: 300000, 2025: 300000 } },
    { k: 'ryczB1', n: 'Podstawa zdrowotnej do I progu',  u: '% przeciętnego', d: { 2026: 60, 2025: 60 } },
    { k: 'ryczB2', n: 'Podstawa zdrowotnej II próg',     u: '% przeciętnego', d: { 2026: 100, 2025: 100 } },
    { k: 'ryczB3', n: 'Podstawa zdrowotnej III próg',    u: '% przeciętnego', d: { 2026: 180, 2025: 180 } }
  ]},
  { g: 'PPK', items: [
    { k: 'ppkP',  n: 'Wpłata podstawowa — pracownik',  u: '%', d: { 2026: 2, 2025: 2 } },
    { k: 'ppkF',  n: 'Wpłata podstawowa — pracodawca', u: '%', d: { 2026: 1.5, 2025: 1.5 } }
  ]},
  { g: 'VAT', items: [
    { k: 'vat1', n: 'Stawka podstawowa', u: '%',  d: { 2026: 23, 2025: 23 } },
    { k: 'vat2', n: 'Stawka obniżona',   u: '%',  d: { 2026: 8, 2025: 8 } },
    { k: 'vat3', n: 'Stawka obniżona',   u: '%',  d: { 2026: 5, 2025: 5 } },
    { k: 'vatLim', n: 'Limit zwolnienia podmiotowego', u: 'zł', d: { 2026: 240000, 2025: 200000 }, check: true }
  ]},
  { g: 'Odsetki', items: [
    { k: 'nbpRef',  n: 'Stopa referencyjna NBP',  u: '%', d: { 2026: 4.25, 2025: 4.75 }, check: true },
    { k: 'nbpLom',  n: 'Stopa lombardowa NBP',    u: '%', d: { 2026: 4.75, 2025: 5.25 }, check: true },
    { k: 'odsUstK', n: 'Odsetki ustawowe (kapitałowe) = referencyjna +', u: 'p.p.', d: { 2026: 3.5, 2025: 3.5 } },
    { k: 'odsUstO', n: 'Odsetki za opóźnienie = referencyjna +',        u: 'p.p.', d: { 2026: 5.5, 2025: 5.5 } },
    { k: 'odsMin',  n: 'Minimalne odsetki podatkowe', u: '%', d: { 2026: 8, 2025: 8 } },
    { k: 'odsProg', n: 'Nie wpłaca się odsetek poniżej', u: 'zł', d: { 2026: 8.70, 2025: 8.70 } }
  ]},
  { g: 'Kadry', items: [
    { k: 'wspEkw',  n: 'Współczynnik ekwiwalentu za urlop', u: '', d: { 2026: 21.00, 2025: 20.83 },
      h: '(365 − niedziele − święta − soboty) ÷ 12' },
    { k: 'urlop1',  n: 'Wymiar urlopu — staż poniżej 10 lat', u: 'dni', d: { 2026: 20, 2025: 20 } },
    { k: 'urlop2',  n: 'Wymiar urlopu — staż od 10 lat',      u: 'dni', d: { 2026: 26, 2025: 26 } },
    { k: 'chorPr',  n: 'Wynagrodzenie chorobowe',   u: '%', d: { 2026: 80, 2025: 80 } },
    { k: 'chorDni', n: 'Dni chorobowego u pracodawcy', u: 'dni', d: { 2026: 33, 2025: 33 },
      h: '14 dni dla pracownika, który skończył 50 lat' },
    { k: 'nocny',   n: 'Dodatek za pracę w nocy', u: '% stawki minimalnej', d: { 2026: 20, 2025: 20 } },
    { k: 'nadg50',  n: 'Dodatek za nadgodziny',   u: '%', d: { 2026: 50, 2025: 50 } },
    { k: 'nadg100', n: 'Dodatek za nadgodziny (noc, niedziele, święta)', u: '%', d: { 2026: 100, 2025: 100 } }
  ]}
];

const PARAM_BY_KEY = {};
PARAMS.forEach(g => g.items.forEach(i => { PARAM_BY_KEY[i.k] = i; }));

/* Wartość parametru dla wybranego roku: własna poprawka albo domyślna. */
function P(key, year) {
  const y = year || S.year;
  const own = S.params && S.params[y] && S.params[y][key];
  if (own !== undefined && own !== null && own !== '') return num(own);
  const def = PARAM_BY_KEY[key];
  if (!def) return 0;
  const v = def.d[y] ?? def.d[YEARS[0]];
  return num(v);
}
function isEdited(key, year) {
  const y = year || S.year;
  return !!(S.params && S.params[y] && S.params[y][key] !== undefined);
}
function setParam(key, value, year) {
  const y = year || S.year;
  S.params[y] = S.params[y] || {};
  if (value === '' || value === null) delete S.params[y][key];
  else S.params[y][key] = num(value);
  save();
}
function resetParams(year) {
  const y = year || S.year;
  delete S.params[y];
  save();
}
const paramCount = year => Object.keys((S.params || {})[year || S.year] || {}).length;

/* Pochodne, z których korzysta kilka kalkulatorów naraz. */
const zusBaseFull  = () => round2(P('avgWage') * 0.6);      // 60% przeciętnego
const zusBasePref  = () => round2(P('minWage') * 0.3);      // 30% minimalnego
const zdrowMin     = () => round2(P('minWage') * P('zdrow') / 100);
const odsUstawowe  = () => round2(P('nbpRef') + P('odsUstK'));
const odsOpoznienie= () => round2(P('nbpRef') + P('odsUstO'));
const odsPodatkowe = () => Math.max(P('odsMin'), round2(2 * P('nbpLom') + 2));
