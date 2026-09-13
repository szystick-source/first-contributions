# Bilans

Księgowość na telefonie. Zero kont, zero sieci — wszystko liczy się i zostaje
w przeglądarce urządzenia (`localStorage`).

Powstał do odrabiania zadań z rachunkowości: prowadzi zadanie od bilansu
otwarcia aż po bilans zamknięcia i rachunek zysków i strat, po drodze
sprawdzając, czy strona Wn równa się stronie Ma.

## Co potrafi

### Księgi
- **Dziennik** — operacje z dowodem i treścią, zapisy proste i złożone
  (jedna operacja na kilku kontach), kontrola równości stron po każdym wpisie.
- **Konta teowe** — każde konto z obrotami i saldem, wprost do przepisania
  do zeszytu.
- **Zestawienie obrotów i sald** — pełna tabela z kontrolą: obroty Wn = obroty
  Ma = suma dziennika.
- **Bilans zamknięcia** — salda ułożone w pozycje sprawozdania, z podpowiedzią,
  z których kont wzięła się każda pozycja, i kontrolą aktywa = pasywa.
- **Rachunek zysków i strat** w wariancie porównawczym wraz z wynikiem
  finansowym; gdy konta wynikowe są jeszcze otwarte, wynik trafia do kapitału
  własnego, żeby bilans się spinał.
- **Plan kont** — wzorcowy układ zespołów 0–8 plus konta pozabilansowe,
  z wyszukiwarką po numerze i nazwie oraz typem konta i stroną, po której rośnie.
- **Schematy księgowań** — kilkadziesiąt typowych operacji z gotową dekretacją.

### Płace
- Umowa o pracę liczona w trzy strony: z brutto, z netto i z kosztu pracodawcy,
  z rozbiciem co do grosza i pełnym kosztem zatrudnienia.
- Umowa zlecenie (pełne składki, bez chorobowej, uczeń do 26 lat, drobna umowa
  do 200 zł) i umowa o dzieło z kosztami 20% albo 50%.
- Ulgi, PIT-2 w wariantach 1/12, 1/24 i 1/36, PPK, próg 32% i limit
  30-krotności liczone narastająco.
- Porównanie form zatrudnienia przy tej samej kwocie brutto.
- **Zaksięguj listę płac** — wynik przenosi się jednym dotknięciem do dziennika
  jako komplet operacji na kontach 404, 230, 223, 222 i 131.

### Kadry
Wymiar urlopu, ekwiwalent ze współczynnikiem, wynagrodzenie chorobowe i zasiłek,
nadgodziny z dodatkami 50% i 100% oraz dodatkiem nocnym, wymiar czasu pracy
w każdym miesiącu roku.

### Firma
Składki ZUS przedsiębiorcy we wszystkich czterech wariantach, porównanie skali,
podatku liniowego i ryczałtu w skali roku, przeliczenia VAT w obie strony,
zestawienie limitów i progów.

### Narzędzia
Odsetki podatkowe i ustawowe wraz z rekompensatą za opóźnienie w transakcjach
handlowych, terminy i dni robocze, amortyzacja liniowa, degresywna
i jednorazowa, rozchód materiałów metodą FIFO, LIFO i średniej ważonej,
analiza wskaźnikowa, marża i narzut.

## Parametry roku

Stawki, progi i limity na lata 2026 i 2025 siedzą w jednym miejscu
(**Ustawienia → Parametry roku**) i **każdy z nich da się poprawić**. Przepisy
zmieniają się częściej niż aplikacja, a zadanie na lekcji bywa liczone na
stawkach z polecenia, nie z Dziennika Ustaw.

Pozycje oznaczone kropką to te, które warto sprawdzić przed oddaniem
wyliczenia — między innymi prognozowane przeciętne wynagrodzenie, limit
30-krotności i stopy NBP, od których zależą odsetki.

Bilans jest pomocą w liczeniu, nie poradą podatkową.

## Uruchomienie

Otwórz `index.html` w przeglądarce — nie ma kroku budowania. Na telefonie
wystaw katalog przez HTTPS (np. GitHub Pages), wejdź na stronę i wybierz
**Dodaj do ekranu głównego**. Manifest ustawia tryb pełnoekranowy i ikonę,
a `sw.js` sprawia, że apka otwiera się bez internetu.

## Dane

Wszystko siedzi pod kluczem `bilans.v1` w `localStorage` i nigdy nie opuszcza
urządzenia. Wyczyszczenie danych przeglądarki kasuje też zadania, więc
Ustawienia → **Pokaż kopię** robi eksport do tekstu, a **Wczytaj kopię**
przywraca go na dowolnym urządzeniu.

## Pliki

| Plik | Do czego |
|---|---|
| `index.html` | szkielet: nagłówek, zakładki, arkusz wysuwany |
| `css/styles.css` | warstwa wizualna — szkło, światło, kontrolki, tabele |
| `js/core.js` | pamięć, formatowanie liczb i dat, arkusze, światło na szkle |
| `js/params.js` | parametry roku 2026 i 2025 wraz z poprawkami użytkownika |
| `js/plan-kont.js` | wzorcowy plan kont, pozycje bilansu i RZiS, schematy księgowań |
| `js/calc.js` | wyliczenia płac, ZUS, podatków, kadr i narzędzi |
| `js/ksiegi.js` | silnik ksiąg: obroty, salda, bilans, wynik |
| `js/ksiegi-ui.js` | widoki i arkusze modułu ksiąg |
| `js/tools.js` | kalkulatory — formularze i rozbicia wyników |
| `js/app.js` | zakładki, przerysowywanie, parametry, ustawienia |
| `sw.js` | działanie bez internetu |
