# Licznik dzienny

Prosta, samodzielna aplikacja webowa do zapisywania końcowego stanu licznika każdego dnia i śledzenia statystyk.

## Jak uruchomić

Otwórz plik `index.html` w przeglądarce (dwuklik lub przeciągnięcie do okna przeglądarki) — nie wymaga instalacji ani serwera.

## Funkcje

- Zapis stanu licznika dla wybranej daty (dodawanie i edycja wpisów).
- Historia wpisów z dzienną zmianą (wzrost/spadek).
- Statystyki: aktualny stan, liczba zapisanych dni, zmiana łączna, średnia zmiana dzienna, najlepszy/najgorszy dzień, min/max, najdłuższa passa wzrostu.
- Wykres trendu w czasie.
- Eksport/import danych do pliku JSON (kopia zapasowa).

## Dane

Wpisy są przechowywane lokalnie w przeglądarce (`localStorage`), więc pozostają zapisane między sesjami na tym samym urządzeniu i w tej samej przeglądarce. Użyj eksportu JSON, aby zrobić kopię zapasową lub przenieść dane na inne urządzenie.
