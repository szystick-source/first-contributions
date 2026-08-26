# MMA Career

Gra desktopowa (Electron) o prowadzeniu kariery zawodnika MMA: trening, walki
i organizacje, finanse/sponsoring oraz media i życie osobiste.

## Uruchomienie (tryb deweloperski)

```bash
npm install
npm start
```

## Test dymny (headless)

W środowisku bez wyświetlacza (np. CI) można przelecieć cały główny przepływ
gry (tworzenie zawodnika → hub → trening → oferta walki → walka → wywiad) i
zapisać zrzuty ekranu każdego kroku:

```bash
SMOKE_OUT=/tmp npm run smoke
```

Wymaga `xvfb-run` w systemie. Zrzuty ekranu trafiają do katalogu wskazanego
zmienną `SMOKE_OUT` (domyślnie `/tmp`) jako pliki `smoke-*.png`.

## Budowanie wersji desktopowej

```bash
npm run dist
```

Paczki trafiają do katalogu `dist/`.

## Struktura projektu

- `main.js` / `preload.js` — proces główny Electrona, zapis/odczyt stanu gry na dysku.
- `src/index.html`, `src/styles.css` — powłoka UI.
- `src/js/data.js` — dane statyczne (kategorie wagowe, organizacje, style walki).
- `src/js/fighter.js` — model zawodnika (statystyki, starzenie, regeneracja).
- `src/js/npc.js` — generowanie przeciwników.
- `src/js/training.js` — system treningu (fokus, intensywność, kontuzje).
- `src/js/matchmaking.js` — oferty walk skalowane do rankingu/sławy zawodnika.
- `src/js/fightSim.js` — silnik symulacji walki rundami (uderzenia, obalenia, parter, poddania, KO/TKO, decyzja).
- `src/js/canvas.js` — odtwarzanie walki na `<canvas>` (paski HP/stamina, pozycja, trafienia).
- `src/js/finance.js` — wypłaty za walki, sponsorzy, wydatki tygodniowe.
- `src/js/media.js` — wywiady pomeczowe i wydarzenia osobiste wpływające na sławę/morale.
- `src/js/calendar.js` — cotygodniowa progresja świata gry.
- `src/js/state.js` — centralny stan gry + zapis/odczyt.
- `src/js/app.js` — kontroler UI / router ekranów.

## Pętla rozgrywki

1. Stwórz zawodnika (styl walki, kategoria wagowa, narodowość).
2. Co tydzień: trenuj (wybierz priorytetowe umiejętności i intensywność) albo
   przyjmij/odrzuć ofertę walki, gdy się pojawi.
3. Walki są symulowane rundami i wizualizowane na canvasie w czasie rzeczywistym.
4. Po walce następuje konferencja prasowa — wybór odpowiedzi wpływa na sławę,
   morale i przyszłe rywalizacje.
5. Zarabiaj na galach i sponsoringu, rozwijaj się, unikaj kontuzji i pnij się
   przez kolejne organizacje (regionalne → krajowe → elitarne → mistrzowskie)
   aż po pas mistrzowski.
