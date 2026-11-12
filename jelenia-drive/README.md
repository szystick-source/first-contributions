# Jelenia Drive

Gra samochodowa na prawdziwym układzie ulic Jeleniej Góry i Szklarskiej Poręby (dane OpenStreetMap).

- `convert.py` – zamienia wycinek OSM (.pbf) na `map.json` dla gry. Wymaga `pip install osmium shapely`.
  Użycie: `python3 -I convert.py dolnoslaskie-latest.osm.pbf map.json`
  (plik z https://download.geofabrik.de/europe/poland/dolnoslaskie-latest.osm.pbf)
- `index.html` – gra (wersja 2). Wczytuje `map.json` z tego samego folderu.
  `map.json` musi dodatkowo mieć pola `landmarks` [{n,x,y,town}], `towns` [{n,x,y}] i `cams` [nazwy ulic z fotoradarem],
  wybrane po wygenerowaniu danych na podstawie listy `poi`.
- `v1-wymyslona-mapa.html` – pierwsza wersja z wymyśloną mapą.

Mapa © współtwórcy OpenStreetMap (ODbL).
