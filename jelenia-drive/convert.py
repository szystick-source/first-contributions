"""Convert an OSM .pbf extract into compact game data for Jelenia Drive.
Usage: python3 -I convert.py <in.pbf> <out.json>
"""
import sys, json, math
import osmium
from shapely.geometry import LineString, Polygon, box
from shapely import wkb as shp_wkb

S, Wl, N, E = 50.790, 15.470, 50.935, 15.800
MPP = 0.35                                   # metres per game pixel
LAT0 = (S + N) / 2
MLON = 111320 * math.cos(math.radians(LAT0))
MLAT = 111229
def proj(lon, lat):
    return ((lon - Wl) * MLON / MPP, (N - lat) * MLAT / MPP)
WW, HH = proj(E, S)
def inb(lon, lat):
    return S <= lat <= N and Wl <= lon <= E

ROADW = {'motorway': 96, 'trunk': 90, 'primary': 82, 'secondary': 72, 'tertiary': 64,
         'unclassified': 54, 'residential': 48, 'living_street': 42,
         'motorway_link': 56, 'trunk_link': 56, 'primary_link': 54, 'secondary_link': 52, 'tertiary_link': 50}
RCLS = {'motorway': 0, 'trunk': 0, 'primary': 1, 'secondary': 2, 'tertiary': 3, 'unclassified': 4,
        'residential': 5, 'living_street': 5, 'motorway_link': 3, 'trunk_link': 3, 'primary_link': 3,
        'secondary_link': 3, 'tertiary_link': 4}
LAND = {}
for k in ('forest', 'wood'): LAND[k] = 'F'
for k in ('grass', 'meadow', 'park', 'grassland', 'garden', 'recreation_ground', 'village_green', 'pitch', 'golf_course'): LAND[k] = 'G'
LAND['cemetery'] = 'C'; LAND['residential'] = 'R'
for k in ('industrial', 'commercial', 'retail', 'railway', 'construction', 'garages'): LAND[k] = 'I'
for k in ('farmland', 'farmyard', 'orchard', 'allotments'): LAND[k] = 'A'
for k in ('scrub', 'heath'): LAND[k] = 'S'
LAND['water'] = 'W'; LAND['basin'] = 'W'; LAND['reservoir'] = 'W'; LAND['riverbank'] = 'W'
BTYPE = {'church': 1, 'chapel': 1, 'cathedral': 1, 'apartments': 2, 'residential': 0, 'house': 0, 'detached': 0,
         'semidetached_house': 0, 'industrial': 3, 'warehouse': 3, 'commercial': 4, 'retail': 4, 'office': 4,
         'garage': 5, 'garages': 5, 'shed': 5, 'hotel': 6, 'public': 7, 'school': 7, 'civic': 7, 'train_station': 7, 'hospital': 7}

names = []; name_idx = {}
def nid(n):
    if not n: return -1
    if n not in name_idx: name_idx[n] = len(names); names.append(n)
    return name_idx[n]

road_ways = []          # (cls, width, nameidx, [node ids], oneway)
node_xy = {}
rails, rivers = [], []
blds, lands, pois = [], [], []
wkbf = osmium.geom.WKBFactory()

class H(osmium.SimpleHandler):
    def way(self, w):
        t = w.tags
        hw = t.get('highway')
        try:
            nodes = [(n.ref, n.lon, n.lat) for n in w.nodes]
        except osmium.InvalidLocationError:
            return
        if not any(inb(lo, la) for _, lo, la in nodes):
            return
        if hw in ROADW:
            if t.get('area') == 'yes': return
            run = []
            for ref, lo, la in nodes:
                if inb(lo, la):
                    node_xy[ref] = proj(lo, la); run.append(ref)
                else:
                    if len(run) > 1: road_ways.append((RCLS[hw], ROADW[hw], nid(t.get('name') or t.get('ref')), run, t.get('ref') or ''))
                    run = []
            if len(run) > 1: road_ways.append((RCLS[hw], ROADW[hw], nid(t.get('name') or t.get('ref')), run, t.get('ref') or ''))
        elif t.get('railway') == 'rail' and t.get('service') is None:
            rails.append([proj(lo, la) for _, lo, la in nodes])
        elif t.get('waterway') in ('river', 'stream', 'canal'):
            ww = t.get('waterway'); nm = t.get('name') or ''
            width = 80 if ww == 'river' else 16
            if nm in ('Bóbr',): width = 110
            if nm in ('Kamienna',): width = 60
            rivers.append((width, nid(nm), [proj(lo, la) for _, lo, la in nodes], 1 if ww == 'river' else 0))

    def node(self, n):
        t = n.tags
        if 'name' not in t: return
        if not inb(n.location.lon, n.location.lat): return
        kind = poi_kind(t)
        if kind: pois.append((kind, t['name'], proj(n.location.lon, n.location.lat)))

    def area(self, a):
        t = a.tags
        isb = 'building' in t
        lt = None
        if not isb:
            for key in ('landuse', 'natural', 'leisure', 'water'):
                v = t.get(key)
                if v in LAND: lt = LAND[v]; break
            if t.get('natural') == 'water' or t.get('waterway') == 'riverbank': lt = 'W'
        kind = poi_kind(t) if 'name' in t else None
        if not (isb or lt or kind): return
        try:
            g = shp_wkb.loads(wkbf.create_multipolygon(a), hex=True)
        except Exception:
            return
        minx, miny, maxx, maxy = g.bounds
        if maxx < Wl or minx > E or maxy < S or miny > N: return
        if kind:
            c = g.representative_point(); pois.append((kind, t['name'], proj(c.x, c.y)))
        if isb:
            if not (Wl <= (minx+maxx)/2 <= E and S <= (miny+maxy)/2 <= N): return
            for p in getattr(g, 'geoms', [g]):
                blds.append((BTYPE.get(t.get('building'), 0), [proj(x, y) for x, y in p.exterior.coords]))
        elif lt:
            for p in getattr(g, 'geoms', [g]):
                lands.append((lt, p))

def poi_kind(t):
    if t.get('place') in ('town', 'suburb', 'village', 'neighbourhood', 'quarter', 'hamlet'): return 'place'
    if t.get('historic') in ('castle', 'monument', 'ruins', 'church'): return 'hist'
    if t.get('tourism') in ('attraction', 'museum', 'viewpoint', 'theme_park'): return 'tour'
    if t.get('natural') in ('waterfall', 'peak'): return t['natural']
    if t.get('amenity') in ('townhall', 'theatre', 'hospital', 'university', 'bus_station', 'fuel'): return t['amenity']
    if t.get('railway') == 'station': return 'station'
    if t.get('shop') == 'mall': return 'mall'
    if t.get('leisure') in ('water_park', 'stadium', 'sports_centre', 'park'): return t['leisure']
    if t.get('aerialway') == 'station': return 'lift'
    if t.get('aeroway') == 'aerodrome': return 'airport'
    return None

H().apply_file(sys.argv[1], locations=True, idx='flex_mem')
print('ways', len(road_ways), 'blds', len(blds), 'lands', len(lands), 'pois', len(pois), file=sys.stderr)

# ---- road graph: split at shared nodes ----
use = {}
for _, _, _, run, _ in road_ways:
    for i, r in enumerate(run):
        use[r] = use.get(r, 0) + (2 if i in (0, len(run) - 1) else 1)
gid = {}; gnodes = []
def gnode(r):
    if r not in gid:
        gid[r] = len(gnodes); x, y = node_xy[r]; gnodes.append((round(x), round(y)))
    return gid[r]
edges = []
def simp(pts, tol):
    if len(pts) <= 2: return pts
    s = LineString(pts).simplify(tol, preserve_topology=False)
    return list(s.coords)
for cls, w, nm, run, ref in road_ways:
    start = 0
    for i in range(1, len(run)):
        if use[run[i]] >= 2 or i == len(run) - 1:
            seg = run[start:i + 1]
            a, b = gnode(seg[0]), gnode(seg[-1])
            pts = simp([node_xy[r] for r in seg], 3)
            q = [(round(x), round(y)) for x, y in pts]
            q[0] = gnodes[a]; q[-1] = gnodes[b]
            if a != b or len(q) > 2:
                edges.append((a, b, cls, w, nm, q))
            start = i

def enc(pts):
    out = []; px = py = 0
    for x, y in pts:
        x, y = round(x), round(y); out += [x - px, y - py]; px, py = x, y
    return out

# ---- land: clip to cells ----
CELL = 3000
land_out = []
for lt, p in lands:
    if not p.is_valid: p = p.buffer(0)
    p = p.simplify(5)
    minx, miny, maxx, maxy = p.bounds
    # project polygon
    def projpoly(poly):
        ext = [proj(x, y) for x, y in poly.exterior.coords]
        holes = [[proj(x, y) for x, y in r.coords] for r in poly.interiors]
        return Polygon(ext, holes)
    try:
        pp = projpoly(p) if p.geom_type == 'Polygon' else None
    except Exception:
        pp = None
    if pp is None or pp.is_empty: continue
    if not pp.is_valid: pp = pp.buffer(0)
    bx0, by0, bx1, by1 = pp.bounds
    for cx in range(int(max(0, bx0) // CELL), int(min(WW, bx1) // CELL) + 1):
        for cy in range(int(max(0, by0) // CELL), int(min(HH, by1) // CELL) + 1):
            cb = box(cx * CELL, cy * CELL, (cx + 1) * CELL, (cy + 1) * CELL)
            try:
                inter = pp.intersection(cb)
            except Exception:
                continue
            if inter.is_empty: continue
            for g in getattr(inter, 'geoms', [inter]):
                if g.geom_type != 'Polygon' or g.area < 400: continue
                rings = [enc(g.exterior.coords)] + [enc(r.coords) for r in g.interiors if Polygon(r).area > 400]
                land_out.append([lt, rings])

bld_out = []
for bt, pts in blds:
    if len(pts) < 4: continue
    pol = Polygon(pts)
    if pol.area < 60: continue
    s = pol.simplify(1.5)
    if s.is_empty or s.geom_type != 'Polygon': continue
    c = list(s.exterior.coords)[:-1]
    if len(c) < 3: continue
    bld_out.append([bt] + enc(c))

riv_out = []
for w, nm, pts, big in rivers:
    pts = [p for p in pts if -2000 < p[0] < WW + 2000 and -2000 < p[1] < HH + 2000]
    if len(pts) < 2: continue
    riv_out.append([w, nm, big, enc(simp(pts, 4))])
rail_out = [enc(simp([p for p in r], 4)) for r in rails if len(r) > 1]

seen = set(); poi_out = []
for k, n, (x, y) in pois:
    key = (k, n)
    if key in seen: continue
    seen.add(key); poi_out.append([k, n, round(x), round(y)])

data = {'W': round(WW), 'H': round(HH), 'mpp': MPP, 'names': names,
        'nodes': [v for xy in gnodes for v in xy],
        'edges': [[a, b, cls, w, nm, enc(q)] for a, b, cls, w, nm, q in edges],
        'land': land_out, 'bld': bld_out, 'riv': riv_out, 'rail': rail_out, 'poi': poi_out}
with open(sys.argv[2], 'w') as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
print('edges', len(edges), 'nodes', len(gnodes), 'land', len(land_out), 'bld', len(bld_out), file=sys.stderr)
