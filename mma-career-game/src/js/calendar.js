import { recoverWeek, applyAging, isInjured } from './fighter.js';
import { applyWeeklyFinance } from './finance.js';
import { generateFightOffer } from './matchmaking.js';
import { maybeGeneratePersonalEvent } from './media.js';

// Advances the world by one week: recovery, aging, finances, and scheduling
// the next fight offer if the player is free and healthy.
export function advanceWeek(state) {
  const fighter = state.data.player;
  state.data.week += 1;
  if (state.data.week > 52) {
    state.data.week = 1;
    state.data.year += 1;
    applyAging(fighter);
    state.logEvent(`${fighter.name} kończy kolejny rok kariery (wiek: ${fighter.age}).`);
  }

  recoverWeek(fighter);

  const sponsorOffer = applyWeeklyFinance(fighter, (msg) => state.logEvent(msg));
  if (sponsorOffer) {
    fighter.sponsors.push(sponsorOffer);
    state.logEvent(`Nowy sponsor: ${sponsorOffer.name} (+$${sponsorOffer.weeklyIncome}/tydzień).`);
  }

  if (!state.data.pendingOffer && !isInjured(fighter) && !fighter.retired) {
    // Give the player a little downtime between fights before the next offer appears.
    if (Math.random() < 0.35) {
      state.data.pendingOffer = generateFightOffer(fighter);
      state.logEvent(`Nowa oferta walki od ${state.data.pendingOffer.orgName} przeciwko ${state.data.pendingOffer.opponent.name}.`);
    }
  }

  if (!state.data.pendingMediaEvent) {
    const personalEvent = maybeGeneratePersonalEvent();
    if (personalEvent) state.data.pendingMediaEvent = personalEvent;
  }

  return { sponsorOffer };
}
