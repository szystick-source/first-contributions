import { WEIGHT_CLASSES, getOrganization, nextOrganization } from './data.js';
import { getRoster } from './roster.js';

function rankPurseFactor(rank) {
  if (rank == null) return 1;
  if (rank === 0) return 3;
  if (rank <= 2) return 2;
  if (rank <= 5) return 1.4;
  return 1.1;
}

// Builds a fight offer scaled to the player's current org and rank within it.
export function generateFightOffer(state) {
  const fighter = state.data.player;

  let orgId = fighter.orgId;
  let isCallUp = false;
  if (fighter.pendingPromotion) {
    orgId = fighter.pendingPromotion;
    isCallUp = true;
  }
  const org = getOrganization(orgId);
  const roster = getRoster(state, org.id, fighter.weightClassId);
  const rank = isCallUp ? null : fighter.rank;

  let opponentIndex;
  let isTitleShot = false;
  if (rank == null) {
    opponentIndex = roster.length - 1; // gatekeeper fight to break into the rankings
  } else if (rank === 0) {
    opponentIndex = 1 + Math.floor(Math.random() * Math.min(3, roster.length - 1)); // title defense
  } else {
    const step = Math.random() < 0.7 ? 1 : 2;
    opponentIndex = Math.max(0, rank - step);
    if (opponentIndex === 0) isTitleShot = true;
  }

  const opponent = roster[opponentIndex];
  const fameFactor = 1 + fighter.fame / 150;
  const purse = Math.round(org.basePurse * fameFactor * rankPurseFactor(rank) * (0.9 + Math.random() * 0.2));

  return {
    id: `offer_${Date.now()}`,
    orgId: org.id,
    orgName: org.name,
    orgTier: org.tier,
    opponent,
    opponentIndex,
    purse,
    winBonus: Math.round(purse * 0.5),
    isTitleShot,
    isCallUp,
    weightClass: WEIGHT_CLASSES.find((w) => w.id === fighter.weightClassId),
  };
}

// Applies win/loss to the player's rank within the offer's org, and handles
// promotion to the next org tier once the belt is won.
export function applyFightOutcome(state, offer, won) {
  const fighter = state.data.player;
  const org = getOrganization(offer.orgId);
  const roster = getRoster(state, offer.orgId, fighter.weightClassId);
  const events = [];

  if (offer.isCallUp) {
    fighter.orgId = offer.orgId;
    fighter.pendingPromotion = null;
    fighter.rank = null;
  }

  const oldRank = fighter.rank;

  if (won) {
    if (oldRank == null) {
      fighter.rank = roster.length - 1;
      events.push(`${fighter.name} wchodzi do rankingu ${org.name} na miejscu #${roster.length}!`);
    } else {
      fighter.rank = offer.opponentIndex;
      if (offer.opponentIndex === 0) {
        events.push(`${fighter.name} zdobywa pas mistrzowski ${org.name}!`);
        const next = nextOrganization(org.id);
        if (next) {
          fighter.pendingPromotion = next.id;
          events.push(`${next.name} zauważa mistrza ${org.name} -- nadchodzi awans!`);
        }
      } else {
        events.push(`${fighter.name} awansuje na miejsce #${offer.opponentIndex + 1} rankingu ${org.name}.`);
      }
    }
  } else if (oldRank != null) {
    if (oldRank >= roster.length - 1) {
      fighter.rank = null;
      events.push(`${fighter.name} wypada z rankingu ${org.name} po porażce.`);
    } else {
      fighter.rank = oldRank + 1;
      events.push(`${fighter.name} spada na miejsce #${fighter.rank + 1} rankingu ${org.name}.`);
    }
  }

  return events;
}
