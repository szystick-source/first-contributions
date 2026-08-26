import { SKILL_KEYS } from './data.js';
import { clamp } from './fighter.js';

export const INTENSITIES = {
  light: { label: 'Lekki', fatigue: 8, injuryChance: 0.01, gainMult: 0.6 },
  normal: { label: 'Normalny', fatigue: 16, injuryChance: 0.04, gainMult: 1.0 },
  hard: { label: 'Ciężki', fatigue: 28, injuryChance: 0.09, gainMult: 1.5 },
};

const INJURY_POOL = [
  { name: 'Naciągnięty mięsień', severity: 'lekka', weeks: 1 },
  { name: 'Skręcona kostka', severity: 'lekka', weeks: 2 },
  { name: 'Uszkodzony staw barkowy', severity: 'średnia', weeks: 4 },
  { name: 'Naderwane więzadło kolana', severity: 'ciężka', weeks: 8 },
];

// focusKeys: array of up to 2 skill keys the player wants to prioritize this week.
export function runTrainingWeek(fighter, focusKeys, intensityKey) {
  const intensity = INTENSITIES[intensityKey] || INTENSITIES.normal;
  const result = { gains: {}, injury: null, fatigueAdded: intensity.fatigue };

  if (fighter.fatigue > 80) {
    result.overtrained = true;
    fighter.morale = clamp(fighter.morale - 5);
  }

  const focus = focusKeys && focusKeys.length ? focusKeys : [SKILL_KEYS[Math.floor(Math.random() * SKILL_KEYS.length)]];

  for (const key of SKILL_KEYS) {
    const isFocused = focus.includes(key);
    const room = fighter.potential - fighter.skills[key];
    if (room <= 0) continue;
    const baseGain = isFocused ? 1.2 : 0.2;
    const gain = baseGain * intensity.gainMult * (0.5 + Math.random()) * clamp(room / 30, 0.2, 1.5);
    if (gain > 0.05) {
      fighter.skills[key] = clamp(fighter.skills[key] + gain, 0, fighter.potential);
      result.gains[key] = Math.round(gain * 10) / 10;
    }
  }

  fighter.fatigue = clamp(fighter.fatigue + intensity.fatigue, 0, 100);

  const fatigueRisk = fighter.fatigue > 70 ? intensity.injuryChance * 1.8 : intensity.injuryChance;
  if (Math.random() < fatigueRisk) {
    const injury = { ...INJURY_POOL[Math.floor(Math.random() * INJURY_POOL.length)] };
    fighter.injuries.push({ name: injury.name, severity: injury.severity, weeksLeft: injury.weeks });
    fighter.health = clamp(fighter.health - (injury.weeks * 3));
    result.injury = injury;
  }

  return result;
}
