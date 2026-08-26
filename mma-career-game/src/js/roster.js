import { getOrganization } from './data.js';
import { generateOpponent } from './npc.js';

// A division's ranking is a fixed-size, fixed-order list of NPCs -- index 0 is
// the champion, index (size-1) the last ranked contender. Player rank is
// tracked separately on the fighter (see fighter.rank) and overlaid onto this
// list for display/matchmaking rather than physically inserted into it.
function powerLevelForTier(tier) {
  return 32 + tier * 11; // tier1 ~= 43 (regional), tier5 ~= 87 (UFC)
}

export function generateRoster(orgTier, weightClassId, size) {
  const avgPower = powerLevelForTier(orgTier);
  const spread = 16;
  const roster = [];
  for (let i = 0; i < size; i++) {
    const target = Math.round(avgPower + spread / 2 - (spread * i) / (size - 1));
    roster.push(generateOpponent(target, weightClassId));
  }
  return roster;
}

export function getRoster(state, orgId, weightClassId) {
  const world = state.data.world;
  world.rankings[orgId] = world.rankings[orgId] || {};
  if (!world.rankings[orgId][weightClassId]) {
    const org = getOrganization(orgId);
    world.rankings[orgId][weightClassId] = generateRoster(org.tier, weightClassId, org.rosterSize || 10);
  }
  return world.rankings[orgId][weightClassId];
}

// Builds the display list (with the player spliced in at their rank, bumping
// the lowest-ranked NPC out of the visible table) for the Ranking tab.
export function buildDisplayRanking(roster, fighter, orgId) {
  const entries = roster.map((npc) => ({ ...npc, isPlayer: false }));
  if (fighter.orgId === orgId && fighter.rank != null) {
    entries.splice(fighter.rank, 0, { ...fighter, isPlayer: true });
    entries.pop();
  }
  return entries;
}
