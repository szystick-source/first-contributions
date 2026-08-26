// Central game state container + save/load glue via the preload-exposed API.
//
// Persisted shape is a small "store" holding every career the player has
// created, keyed by id, plus which one is currently active. `this.data`
// always points at the active career's data object (same reference that
// lives inside `this.store.careers`), so any in-place mutation of `data`
// is automatically reflected when the whole store is next saved.

const initialCareerData = () => ({
  version: 1,
  week: 1,
  year: 1,
  player: null,
  pendingOffer: null, // next scheduled fight offer { opponent, orgId, purse, title }
  lastFightSummary: null,
  events: [], // rolling log of recent narrative events, newest first
  pendingMediaEvent: null,
  world: { rankings: {} }, // per-org, per-weight-class ranked NPC rosters, generated lazily
});

function makeCareerId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export class GameState {
  constructor() {
    this.store = { activeId: null, careers: {} };
    this.data = initialCareerData();
  }

  listCareers() {
    return Object.entries(this.store.careers)
      .map(([id, data]) => ({ id, data }))
      .sort((a, b) => (b.data.year * 52 + b.data.week) - (a.data.year * 52 + a.data.week));
  }

  createCareer() {
    const id = makeCareerId();
    this.data = initialCareerData();
    this.store.careers[id] = this.data;
    this.store.activeId = id;
    return id;
  }

  selectCareer(id) {
    if (!this.store.careers[id]) return false;
    this.data = this.store.careers[id];
    this.store.activeId = id;
    this._migrateCareer(this.data);
    return true;
  }

  deleteCareer(id) {
    delete this.store.careers[id];
    if (this.store.activeId === id) {
      this.store.activeId = null;
      this.data = initialCareerData();
    }
  }

  logEvent(text) {
    this.data.events.unshift({ week: this.data.week, year: this.data.year, text });
    this.data.events = this.data.events.slice(0, 50);
  }

  async save() {
    if (this.store.activeId) this.store.careers[this.store.activeId] = this.data;
    if (window.api) return window.api.saveGame(this.store);
    return { ok: false, error: 'no api' };
  }

  async load() {
    if (!window.api) return false;
    const res = await window.api.loadGame();
    if (!res.ok || !res.data) return false;

    if (res.data.careers) {
      this.store = res.data;
    } else if (res.data.player) {
      // Legacy single-career save (pre multi-career support) -- wrap it as
      // the sole entry in the new store shape instead of discarding it.
      const id = makeCareerId();
      this.store = { activeId: id, careers: { [id]: res.data } };
    } else {
      return false;
    }

    for (const id of Object.keys(this.store.careers)) this._migrateCareer(this.store.careers[id]);
    if (this.store.activeId && this.store.careers[this.store.activeId]) {
      this.data = this.store.careers[this.store.activeId];
    }
    return Object.keys(this.store.careers).length > 0;
  }

  // Backfills fields introduced after a save was written, so an older save
  // (missing rankings/org data) doesn't crash on load.
  _migrateCareer(data) {
    data.world = data.world || { rankings: {} };
    data.world.rankings = data.world.rankings || {};
    const p = data.player;
    if (p) {
      if (p.rank === undefined) p.rank = null;
      if (p.pendingPromotion === undefined) p.pendingPromotion = null;
      if (!p.strategy) p.strategy = 'balanced';
      const knownOrgIds = ['cw', 'lfa', 'bellator', 'one', 'ufc'];
      if (!knownOrgIds.includes(p.orgId)) {
        p.orgId = 'cw';
        p.rank = null;
      }
    }
    if (data.pendingOffer && data.pendingOffer.opponentIndex === undefined) {
      data.pendingOffer = null;
    }
  }
}

export const gameState = new GameState();
