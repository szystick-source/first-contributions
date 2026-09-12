# Pryzmat

Planer wydatków na telefon. Jedna strona, zero kont, zero sieci — wszystkie dane
zostają w przeglądarce urządzenia (`localStorage`).

## Co potrafi

- **Gdzie idą pieniądze** — podział na kategorie z limitami, porównanie każdej
  kategorii ze średnią z pięciu miesięcy, sześciomiesięczny trend, wykrywanie
  subskrypcji wraz z ich rocznym kosztem.
- **Ile mogę dziś wydać** — dzienny limit liczony z kopert budżetowych i tempa
  wydatków, prognoza salda na koniec miesiąca, alerty o przekroczeniach.
- **Odkładanie** — cele z paskiem postępu i datą dojścia przy obecnym tempie,
  zaokrąglanie każdego wydatku w górę z resztą lądującą w skarbonce.
- **Wyjazdy** — plan kosztów pozycja po pozycji, budżet na dzień i na osobę,
  przeliczenie na walutę, wydatki z wyjazdu trzymane poza budżetem codziennym.
- **Długi** — kto komu ile wisi, spłaty częściowe z historią, bilans netto.
- **Szybkie dodawanie** — szablony jednym dotknięciem i płatności stałe, które
  dopisują się same, gdy nadejdzie ich dzień.

## Uruchomienie

Otwórz `index.html` w przeglądarce — to wszystko, nie ma kroku budowania.
Do korzystania na telefonie wystaw katalog przez HTTPS (np. GitHub Pages:
Settings → Pages → gałąź z tym katalogiem), wejdź na stronę i wybierz
**Dodaj do ekranu głównego**. Manifest ustawia tryb pełnoekranowy i ikonę.

## Dane

Wszystko siedzi pod kluczem `pryzmat.v1` w `localStorage` i nigdy nie opuszcza
urządzenia. Wyczyszczenie danych przeglądarki kasuje też wpisy, więc
Ustawienia → **Pokaż kopię** robi eksport do tekstu, a **Wczytaj kopię**
przywraca go na dowolnym urządzeniu.

## Pliki

| Plik | Do czego |
|---|---|
| `index.html` | cała aplikacja: style, widoki i logika w jednym pliku |
| `manifest.webmanifest` | nazwa, kolory i ikony dla trybu aplikacji |
| `icon-*.png` | ikony ekranu głównego (w tym maskowalna dla Androida) |
