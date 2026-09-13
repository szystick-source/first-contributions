"use strict";
/* ============================================================
   Wzorcowy plan kont — układ, jakiego uczy się w technikum.
   t: A aktywne · P pasywne · AP aktywno-pasywne ·
      K kosztowe · Pr przychodowe · W rozliczeniowe · PB pozabilansowe
   b: pozycja bilansu, s: -1 gdy konto koryguje (umorzenie)
   r: pozycja rachunku zysków i strat (wariant porównawczy)
   ============================================================ */

const ZESPOLY = [
  { z: '0', n: 'Aktywa trwałe' },
  { z: '1', n: 'Środki pieniężne i rachunki bankowe' },
  { z: '2', n: 'Rozrachunki i roszczenia' },
  { z: '3', n: 'Materiały i towary' },
  { z: '4', n: 'Koszty według rodzajów' },
  { z: '5', n: 'Koszty według typów działalności' },
  { z: '6', n: 'Produkty i rozliczenia międzyokresowe' },
  { z: '7', n: 'Przychody i koszty ich osiągnięcia' },
  { z: '8', n: 'Kapitały, fundusze i wynik finansowy' },
  { z: '9', n: 'Konta pozabilansowe' }
];

const PLAN = [
  /* 0 — aktywa trwałe */
  { k: '010', n: 'Środki trwałe', t: 'A', b: 'A.II' },
  { k: '020', n: 'Wartości niematerialne i prawne', t: 'A', b: 'A.I' },
  { k: '030', n: 'Długoterminowe aktywa finansowe', t: 'A', b: 'A.IV' },
  { k: '070', n: 'Odpisy umorzeniowe środków trwałych', t: 'P', b: 'A.II', s: -1 },
  { k: '071', n: 'Odpisy umorzeniowe wartości niematerialnych i prawnych', t: 'P', b: 'A.I', s: -1 },
  { k: '080', n: 'Środki trwałe w budowie', t: 'A', b: 'A.II' },

  /* 1 — środki pieniężne */
  { k: '100', n: 'Kasa', t: 'A', b: 'B.III' },
  { k: '131', n: 'Rachunek bieżący', t: 'A', b: 'B.III' },
  { k: '135', n: 'Inne rachunki bankowe', t: 'A', b: 'B.III' },
  { k: '137', n: 'Rachunek walutowy', t: 'A', b: 'B.III' },
  { k: '138', n: 'Kredyty bankowe', t: 'P', b: 'PB.III' },
  { k: '139', n: 'Inne środki pieniężne', t: 'A', b: 'B.III' },
  { k: '140', n: 'Krótkoterminowe aktywa finansowe', t: 'A', b: 'B.III' },
  { k: '149', n: 'Środki pieniężne w drodze', t: 'AP', b: 'B.III' },

  /* 2 — rozrachunki */
  { k: '200', n: 'Rozrachunki z odbiorcami', t: 'AP', b: 'B.II', bp: 'PB.III' },
  { k: '201', n: 'Rozrachunki z dostawcami', t: 'AP', b: 'B.II', bp: 'PB.III' },
  { k: '220', n: 'Rozrachunki publicznoprawne', t: 'AP', b: 'B.II', bp: 'PB.III' },
  { k: '221', n: 'Rozrachunki z tytułu VAT', t: 'AP', b: 'B.II', bp: 'PB.III' },
  { k: '222', n: 'Rozrachunki z urzędem skarbowym z tytułu PIT', t: 'AP', b: 'B.II', bp: 'PB.III' },
  { k: '223', n: 'Rozrachunki z ZUS', t: 'AP', b: 'B.II', bp: 'PB.III' },
  { k: '230', n: 'Rozrachunki z pracownikami z tytułu wynagrodzeń', t: 'AP', b: 'B.II', bp: 'PB.III' },
  { k: '234', n: 'Pozostałe rozrachunki z pracownikami', t: 'AP', b: 'B.II', bp: 'PB.III' },
  { k: '240', n: 'Pozostałe rozrachunki', t: 'AP', b: 'B.II', bp: 'PB.III' },
  { k: '249', n: 'Odpisy aktualizujące rozrachunki', t: 'P', b: 'B.II', s: -1 },

  /* 3 — materiały i towary */
  { k: '300', n: 'Rozliczenie zakupu', t: 'AP', b: 'B.I', bp: 'PB.III' },
  { k: '310', n: 'Materiały', t: 'A', b: 'B.I' },
  { k: '330', n: 'Towary', t: 'A', b: 'B.I' },
  { k: '340', n: 'Odchylenia od cen ewidencyjnych materiałów i towarów', t: 'AP', b: 'B.I' },

  /* 4 — koszty rodzajowe */
  { k: '400', n: 'Amortyzacja', t: 'K', r: 'B.I' },
  { k: '401', n: 'Zużycie materiałów i energii', t: 'K', r: 'B.II' },
  { k: '402', n: 'Usługi obce', t: 'K', r: 'B.III' },
  { k: '403', n: 'Podatki i opłaty', t: 'K', r: 'B.IV' },
  { k: '404', n: 'Wynagrodzenia', t: 'K', r: 'B.V' },
  { k: '405', n: 'Ubezpieczenia społeczne i inne świadczenia', t: 'K', r: 'B.VI' },
  { k: '409', n: 'Pozostałe koszty rodzajowe', t: 'K', r: 'B.VII' },
  { k: '490', n: 'Rozliczenie kosztów', t: 'W' },

  /* 5 — koszty według typów działalności */
  { k: '500', n: 'Koszty działalności podstawowej — produkcyjnej', t: 'K' },
  { k: '520', n: 'Koszty wydziałowe', t: 'K' },
  { k: '527', n: 'Koszty sprzedaży', t: 'K' },
  { k: '530', n: 'Koszty działalności pomocniczej', t: 'K' },
  { k: '550', n: 'Koszty zarządu', t: 'K' },
  { k: '580', n: 'Rozliczenie kosztów działalności', t: 'W' },

  /* 6 — produkty i rozliczenia międzyokresowe */
  { k: '600', n: 'Produkty gotowe', t: 'A', b: 'B.I' },
  { k: '620', n: 'Odchylenia od cen ewidencyjnych produktów', t: 'AP', b: 'B.I' },
  { k: '640', n: 'Rozliczenia międzyokresowe kosztów', t: 'AP', b: 'B.IV', bp: 'PB.IV' },

  /* 7 — przychody i koszty ich osiągnięcia */
  { k: '700', n: 'Sprzedaż produktów', t: 'Pr', r: 'A.I' },
  { k: '701', n: 'Koszt sprzedanych produktów', t: 'K', r: 'B.VIII' },
  { k: '730', n: 'Sprzedaż towarów', t: 'Pr', r: 'A.IV' },
  { k: '731', n: 'Wartość sprzedanych towarów w cenach zakupu', t: 'K', r: 'B.VIII' },
  { k: '740', n: 'Sprzedaż materiałów', t: 'Pr', r: 'A.IV' },
  { k: '741', n: 'Wartość sprzedanych materiałów', t: 'K', r: 'B.VIII' },
  { k: '750', n: 'Przychody finansowe', t: 'Pr', r: 'G' },
  { k: '751', n: 'Koszty finansowe', t: 'K', r: 'H' },
  { k: '760', n: 'Pozostałe przychody operacyjne', t: 'Pr', r: 'D' },
  { k: '761', n: 'Pozostałe koszty operacyjne', t: 'K', r: 'E' },

  /* 8 — kapitały i wynik */
  { k: '800', n: 'Kapitał (fundusz) podstawowy', t: 'P', b: 'PA.I' },
  { k: '810', n: 'Kapitał (fundusz) zapasowy', t: 'P', b: 'PA.II' },
  { k: '820', n: 'Rozliczenie wyniku finansowego', t: 'AP', b: 'PA.V' },
  { k: '840', n: 'Rezerwy i rozliczenia międzyokresowe przychodów', t: 'P', b: 'PB.I' },
  { k: '850', n: 'Zakładowy fundusz świadczeń socjalnych', t: 'P', b: 'PB.IV' },
  { k: '860', n: 'Wynik finansowy', t: 'AP', b: 'PA.VI' },
  { k: '870', n: 'Podatek dochodowy', t: 'K', r: 'J' },

  /* 9 — pozabilansowe */
  { k: '091', n: 'Obce środki trwałe', t: 'PB' },
  { k: '092', n: 'Środki trwałe w likwidacji', t: 'PB' },
  { k: '093', n: 'Zapasy obce', t: 'PB' },
  { k: '094', n: 'Należności warunkowe', t: 'PB' },
  { k: '095', n: 'Zobowiązania warunkowe', t: 'PB' }
];

const PLAN_BY_K = Object.fromEntries(PLAN.map(a => [a.k, a]));

const TYPE_NAME = {
  A: 'aktywne', P: 'pasywne', AP: 'aktywno-pasywne', K: 'kosztowe',
  Pr: 'przychodowe', W: 'rozliczeniowe', PB: 'pozabilansowe'
};
const TYPE_SHORT = { A: 'A', P: 'P', AP: 'A-P', K: 'K', Pr: 'Prz', W: 'R', PB: 'Poza' };
/* Po której stronie konto rośnie. */
const TYPE_GROW = { A: 'Wn', P: 'Ma', AP: 'obu', K: 'Wn', Pr: 'Ma', W: 'obu', PB: 'Wn' };
const isWynikowe = t => t === 'K' || t === 'Pr';
const isBilansowe = t => t === 'A' || t === 'P' || t === 'AP';

/* Pozycje bilansu w kolejności prezentacji. */
const BILANS_A = [
  { k: 'A',    n: 'Aktywa trwałe', sum: true },
  { k: 'A.I',  n: 'Wartości niematerialne i prawne' },
  { k: 'A.II', n: 'Rzeczowe aktywa trwałe' },
  { k: 'A.III',n: 'Należności długoterminowe' },
  { k: 'A.IV', n: 'Inwestycje długoterminowe' },
  { k: 'A.V',  n: 'Długoterminowe rozliczenia międzyokresowe' },
  { k: 'B',    n: 'Aktywa obrotowe', sum: true },
  { k: 'B.I',  n: 'Zapasy' },
  { k: 'B.II', n: 'Należności krótkoterminowe' },
  { k: 'B.III',n: 'Inwestycje krótkoterminowe' },
  { k: 'B.IV', n: 'Krótkoterminowe rozliczenia międzyokresowe' }
];
const BILANS_P = [
  { k: 'PA',    n: 'Kapitał (fundusz) własny', sum: true },
  { k: 'PA.I',  n: 'Kapitał (fundusz) podstawowy' },
  { k: 'PA.II', n: 'Kapitał (fundusz) zapasowy' },
  { k: 'PA.V',  n: 'Zysk (strata) z lat ubiegłych' },
  { k: 'PA.VI', n: 'Zysk (strata) netto' },
  { k: 'PB',    n: 'Zobowiązania i rezerwy na zobowiązania', sum: true },
  { k: 'PB.I',  n: 'Rezerwy na zobowiązania' },
  { k: 'PB.II', n: 'Zobowiązania długoterminowe' },
  { k: 'PB.III',n: 'Zobowiązania krótkoterminowe' },
  { k: 'PB.IV', n: 'Rozliczenia międzyokresowe' }
];

/* Rachunek zysków i strat — wariant porównawczy. */
const RZIS = [
  { k: 'A',      n: 'Przychody netto ze sprzedaży i zrównane z nimi', sum: true },
  { k: 'A.I',    n: 'Przychody netto ze sprzedaży produktów' },
  { k: 'A.IV',   n: 'Przychody netto ze sprzedaży towarów i materiałów' },
  { k: 'B',      n: 'Koszty działalności operacyjnej', sum: true },
  { k: 'B.I',    n: 'Amortyzacja' },
  { k: 'B.II',   n: 'Zużycie materiałów i energii' },
  { k: 'B.III',  n: 'Usługi obce' },
  { k: 'B.IV',   n: 'Podatki i opłaty' },
  { k: 'B.V',    n: 'Wynagrodzenia' },
  { k: 'B.VI',   n: 'Ubezpieczenia społeczne i inne świadczenia' },
  { k: 'B.VII',  n: 'Pozostałe koszty rodzajowe' },
  { k: 'B.VIII', n: 'Wartość sprzedanych towarów i materiałów' },
  { k: 'C',      n: 'Zysk (strata) ze sprzedaży', calc: 'A-B', strong: true },
  { k: 'D',      n: 'Pozostałe przychody operacyjne' },
  { k: 'E',      n: 'Pozostałe koszty operacyjne' },
  { k: 'F',      n: 'Zysk (strata) z działalności operacyjnej', calc: 'C+D-E', strong: true },
  { k: 'G',      n: 'Przychody finansowe' },
  { k: 'H',      n: 'Koszty finansowe' },
  { k: 'I',      n: 'Zysk (strata) brutto', calc: 'F+G-H', strong: true },
  { k: 'J',      n: 'Podatek dochodowy' },
  { k: 'K',      n: 'Zysk (strata) netto', calc: 'I-J', strong: true }
];

/* ------------------------------------------------------------
   Schematy typowych operacji — podpowiedź, nie wyrocznia.
   W zadaniu zawsze rządzi treść polecenia.
   ------------------------------------------------------------ */
const SCHEMATY = [
  { g: 'Kasa i bank', ops: [
    { n: 'Wpłata gotówki do kasy od odbiorcy', d: 'KP', l: [['100','wn'],['200','ma']] },
    { n: 'Podjęcie gotówki z banku do kasy', d: 'KP/WB', l: [['100','wn'],['149','ma']] },
    { n: 'Wpłata gotówki z kasy na rachunek', d: 'KW', l: [['149','wn'],['100','ma']] },
    { n: 'Wyciąg: środki wpłynęły na rachunek', d: 'WB', l: [['131','wn'],['149','ma']] },
    { n: 'Zapłata zobowiązania przelewem', d: 'WB', l: [['201','wn'],['131','ma']] },
    { n: 'Wpływ należności od odbiorcy', d: 'WB', l: [['131','wn'],['200','ma']] },
    { n: 'Zaciągnięcie kredytu na rachunek', d: 'WB', l: [['131','wn'],['138','ma']] },
    { n: 'Spłata raty kredytu', d: 'WB', l: [['138','wn'],['131','ma']] },
    { n: 'Odsetki od kredytu', d: 'WB', l: [['751','wn'],['131','ma']] },
    { n: 'Odsetki od środków na rachunku', d: 'WB', l: [['131','wn'],['750','ma']] }
  ]},
  { g: 'Zakup materiałów i towarów', ops: [
    { n: 'Faktura za materiały — wartość netto', d: 'FV', l: [['300','wn'],['201','ma']] },
    { n: 'Faktura za materiały — VAT naliczony', d: 'FV', l: [['221','wn'],['201','ma']] },
    { n: 'Przyjęcie materiałów do magazynu', d: 'PZ', l: [['310','wn'],['300','ma']] },
    { n: 'Przyjęcie towarów do magazynu', d: 'PZ', l: [['330','wn'],['300','ma']] },
    { n: 'Wydanie materiałów do zużycia', d: 'RW', l: [['401','wn'],['310','ma']] },
    { n: 'Koszty transportu zakupu', d: 'FV', l: [['300','wn'],['201','ma']] },
    { n: 'Niedobór stwierdzony przy dostawie', d: 'PK', l: [['240','wn'],['300','ma']] }
  ]},
  { g: 'Sprzedaż', ops: [
    { n: 'Faktura sprzedaży towarów — wartość netto', d: 'FV', l: [['200','wn'],['730','ma']] },
    { n: 'Faktura sprzedaży — VAT należny', d: 'FV', l: [['200','wn'],['221','ma']] },
    { n: 'Wydanie sprzedanych towarów z magazynu', d: 'WZ', l: [['731','wn'],['330','ma']] },
    { n: 'Faktura sprzedaży wyrobów gotowych', d: 'FV', l: [['200','wn'],['700','ma']] },
    { n: 'Wydanie wyrobów gotowych', d: 'WZ', l: [['701','wn'],['600','ma']] },
    { n: 'Sprzedaż materiałów', d: 'FV', l: [['200','wn'],['740','ma']] },
    { n: 'Wydanie sprzedanych materiałów', d: 'WZ', l: [['741','wn'],['310','ma']] }
  ]},
  { g: 'Wynagrodzenia', ops: [
    { n: 'Lista płac — wynagrodzenie brutto', d: 'LP', l: [['404','wn'],['230','ma']] },
    { n: 'Potrącenie składek ZUS pracownika', d: 'LP', l: [['230','wn'],['223','ma']] },
    { n: 'Potrącenie składki zdrowotnej', d: 'LP', l: [['230','wn'],['223','ma']] },
    { n: 'Potrącenie zaliczki na podatek', d: 'LP', l: [['230','wn'],['222','ma']] },
    { n: 'Wypłata wynagrodzenia netto', d: 'WB/KW', l: [['230','wn'],['131','ma']] },
    { n: 'Składki ZUS obciążające pracodawcę', d: 'PK', l: [['405','wn'],['223','ma']] },
    { n: 'Przelew składek do ZUS', d: 'WB', l: [['223','wn'],['131','ma']] },
    { n: 'Przelew zaliczki na PIT do US', d: 'WB', l: [['222','wn'],['131','ma']] }
  ]},
  { g: 'Środki trwałe', ops: [
    { n: 'Zakup środka trwałego — faktura', d: 'FV', l: [['080','wn'],['201','ma']] },
    { n: 'Przyjęcie środka trwałego do używania', d: 'OT', l: [['010','wn'],['080','ma']] },
    { n: 'Odpis amortyzacyjny', d: 'PK', l: [['400','wn'],['070','ma']] },
    { n: 'Likwidacja środka trwałego — umorzenie', d: 'LT', l: [['070','wn'],['010','ma']] },
    { n: 'Likwidacja — wartość nieumorzona', d: 'LT', l: [['761','wn'],['010','ma']] },
    { n: 'Sprzedaż środka trwałego — przychód', d: 'FV', l: [['200','wn'],['760','ma']] }
  ]},
  { g: 'VAT i podatki', ops: [
    { n: 'Rozliczenie VAT — przeksięgowanie naliczonego', d: 'PK', l: [['221','wn'],['221','ma']] },
    { n: 'Zapłata VAT do urzędu', d: 'WB', l: [['221','wn'],['131','ma']] },
    { n: 'Zwrot VAT z urzędu', d: 'WB', l: [['131','wn'],['221','ma']] },
    { n: 'Naliczony podatek dochodowy', d: 'PK', l: [['870','wn'],['220','ma']] },
    { n: 'Podatek od nieruchomości', d: 'PK', l: [['403','wn'],['220','ma']] }
  ]},
  { g: 'Zamknięcie okresu', ops: [
    { n: 'Przeniesienie kosztów rodzajowych na wynik', d: 'PK', l: [['860','wn'],['490','ma']] },
    { n: 'Przeniesienie przychodów ze sprzedaży na wynik', d: 'PK', l: [['730','wn'],['860','ma']] },
    { n: 'Przeniesienie kosztu własnego sprzedaży', d: 'PK', l: [['860','wn'],['731','ma']] },
    { n: 'Przeniesienie pozostałych przychodów operacyjnych', d: 'PK', l: [['760','wn'],['860','ma']] },
    { n: 'Przeniesienie pozostałych kosztów operacyjnych', d: 'PK', l: [['860','wn'],['761','ma']] },
    { n: 'Przeniesienie przychodów finansowych', d: 'PK', l: [['750','wn'],['860','ma']] },
    { n: 'Przeniesienie kosztów finansowych', d: 'PK', l: [['860','wn'],['751','ma']] },
    { n: 'Przeniesienie podatku dochodowego', d: 'PK', l: [['860','wn'],['870','ma']] },
    { n: 'Przeniesienie zysku netto na rozliczenie wyniku', d: 'PK', l: [['860','wn'],['820','ma']] }
  ]}
];

const DOWODY = ['KP','KW','WB','FV','PZ','WZ','RW','PW','OT','LT','LP','PK','Rk','MM'];
