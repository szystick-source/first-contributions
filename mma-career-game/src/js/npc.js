import { SKILL_KEYS, NATIONALITIES } from './data.js';
import { randomName, clamp } from './fighter.js';

// Generates an opponent scaled around a target overall rating so matchmaking
// can produce fair-ish (but not identical) fights depending on org tier / rank.
export function generateOpponent(targetOverall, weightClassId) {
  const variance = 10;
  const overall = clamp(targetOverall + Math.floor(Math.random() * variance * 2) - variance, 25, 95);
  const skills = {};
  for (const k of SKILL_KEYS) {
    skills[k] = clamp(overall + Math.floor(Math.random() * 16) - 8);
  }
  const wins = Math.floor(Math.random() * 15);
  const losses = Math.floor(Math.random() * 8);
  return {
    id: `npc_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    name: randomName(),
    nationality: NATIONALITIES[Math.floor(Math.random() * NATIONALITIES.length)],
    weightClassId,
    age: 22 + Math.floor(Math.random() * 14),
    skills,
    fame: clamp(Math.round(overall * 0.6 + wins * 1.5), 1, 99),
    record: { wins, losses, draws: Math.floor(Math.random() * 2), koWins: Math.floor(wins * 0.4), subWins: Math.floor(wins * 0.3) },
  };
}
