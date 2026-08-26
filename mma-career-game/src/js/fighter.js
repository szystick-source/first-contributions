import { ARCHETYPES, SKILL_KEYS, FIRST_NAMES, LAST_NAMES, NATIONALITIES } from './data.js';

export function randomName() {
  const f = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const l = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${f} ${l}`;
}

export function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

export function createPlayerFighter({ name, nationality, weightClassId, archetype }) {
  const base = ARCHETYPES[archetype].base;
  const skills = {};
  for (const k of SKILL_KEYS) skills[k] = base[k] + Math.floor(Math.random() * 6) - 3;

  return {
    id: 'player',
    name: name || randomName(),
    nationality: nationality || NATIONALITIES[0],
    weightClassId,
    archetype,
    age: 21,
    skills,
    potential: clamp(75 + Math.floor(Math.random() * 20), 60, 99),
    health: 100, // physical condition, drops with injuries
    fatigue: 0, // rises with training/fights, needs rest to recover
    morale: 70, // mental state, affects performance
    fame: 2, // reputation/fanbase, drives purses & sponsors
    money: 1000,
    record: { wins: 0, losses: 0, draws: 0, koWins: 0, subWins: 0 },
    injuries: [], // { name, weeksLeft, severity }
    orgId: null,
    contract: null, // { orgId, fightsLeft, perFight }
    rivals: [], // npc ids
    sponsors: [], // { name, weeklyIncome, weeksLeft }
    socialFollowers: 100,
    retired: false,
  };
}

export function overallRating(fighter) {
  const s = fighter.skills;
  const avg = SKILL_KEYS.reduce((sum, k) => sum + s[k], 0) / SKILL_KEYS.length;
  return Math.round(avg);
}

export function isInjured(fighter) {
  return fighter.injuries.length > 0;
}

export function applyAging(fighter) {
  fighter.age += 1;
  // Past 33, physical skills start to decline; cardio/chin decay first.
  if (fighter.age > 33) {
    const decline = (fighter.age - 33) * 0.6;
    fighter.skills.cardio = clamp(fighter.skills.cardio - decline);
    fighter.skills.speed = clamp(fighter.skills.speed - decline * 0.8);
    fighter.skills.chin = clamp(fighter.skills.chin - decline * 0.5);
  }
}

export function recoverWeek(fighter) {
  fighter.fatigue = clamp(fighter.fatigue - 20, 0, 100);
  fighter.health = clamp(fighter.health + (fighter.fatigue < 30 ? 8 : 3), 0, 100);
  fighter.injuries = fighter.injuries
    .map((inj) => ({ ...inj, weeksLeft: inj.weeksLeft - 1 }))
    .filter((inj) => inj.weeksLeft > 0);
  // Morale drifts back toward neutral.
  fighter.morale += fighter.morale < 60 ? 2 : fighter.morale > 60 ? -1 : 0;
  fighter.morale = clamp(fighter.morale);
}
