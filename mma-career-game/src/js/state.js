// Central game state container + save/load glue via the preload-exposed API.

const initialState = () => ({
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

export class GameState {
  constructor() {
    this.data = initialState();
  }

  reset() {
    this.data = initialState();
  }

  logEvent(text) {
    this.data.events.unshift({ week: this.data.week, year: this.data.year, text });
    this.data.events = this.data.events.slice(0, 50);
  }

  async save() {
    if (window.api) {
      return window.api.saveGame(this.data);
    }
    return { ok: false, error: 'no api' };
  }

  async load() {
    if (window.api) {
      const res = await window.api.loadGame();
      if (res.ok && res.data) {
        this.data = res.data;
        this._migrate();
        return true;
      }
    }
    return false;
  }

  // Backfills fields introduced after a save was written, so an older save
  // (missing rankings/org data) doesn't crash on load.
  _migrate() {
    this.data.world = this.data.world || { rankings: {} };
    this.data.world.rankings = this.data.world.rankings || {};
    const p = this.data.player;
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
    if (this.data.pendingOffer && this.data.pendingOffer.opponentIndex === undefined) {
      this.data.pendingOffer = null;
    }
  }

  async deleteSave() {
    if (window.api) return window.api.deleteSave();
    return { ok: false };
  }
}

export const gameState = new GameState();
