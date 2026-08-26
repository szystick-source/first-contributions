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
        return true;
      }
    }
    return false;
  }

  async deleteSave() {
    if (window.api) return window.api.deleteSave();
    return { ok: false };
  }
}

export const gameState = new GameState();
