import { ORGANIZATIONS, WEIGHT_CLASSES } from './data.js';
import { overallRating } from './fighter.js';
import { generateOpponent } from './npc.js';

export function availableOrgs(fighter) {
  return ORGANIZATIONS.filter((o) => fighter.fame >= o.minFame);
}

export function bestAvailableOrg(fighter) {
  const orgs = availableOrgs(fighter);
  return orgs[orgs.length - 1] || ORGANIZATIONS[0];
}

// Builds a fight offer scaled to the player's current standing.
export function generateFightOffer(fighter) {
  const org = bestAvailableOrg(fighter);
  const overall = overallRating(fighter);
  const opponent = generateOpponent(overall, fighter.weightClassId);
  const fameFactor = 1 + fighter.fame / 100;
  const purse = Math.round(org.basePurse * fameFactor * (0.85 + Math.random() * 0.3));
  const isTitleShot = org.tier >= 3 && fighter.fame > 60 && Math.random() < 0.25;

  return {
    id: `offer_${Date.now()}`,
    orgId: org.id,
    orgName: org.name,
    orgTier: org.tier,
    opponent,
    purse,
    winBonus: Math.round(purse * 0.5),
    isTitleShot,
    weightClass: WEIGHT_CLASSES.find((w) => w.id === fighter.weightClassId),
  };
}
