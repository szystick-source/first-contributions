import { clamp } from './fighter.js';

const SPONSOR_NAMES = ['FightGear', 'IronFuel Suplementy', 'RedLine Energy', 'Apex Odzież', 'PowerWrap', 'VictoryBet'];

// Weekly recurring costs: gym, coach, camp; scale a bit with fame (better camps cost more).
export function weeklyExpenses(fighter) {
  const base = 80;
  const fameScale = 1 + fighter.fame / 120;
  return Math.round(base * fameScale);
}

export function applyWeeklyFinance(fighter, log) {
  const expenses = weeklyExpenses(fighter);
  fighter.money -= expenses;

  let sponsorIncome = 0;
  fighter.sponsors = fighter.sponsors.filter((s) => s.weeksLeft > 0);
  for (const s of fighter.sponsors) {
    sponsorIncome += s.weeklyIncome;
    s.weeksLeft -= 1;
  }
  fighter.money += sponsorIncome;

  if (log) log(`Wydatki tygodniowe: -$${expenses}${sponsorIncome ? `, sponsorzy: +$${sponsorIncome}` : ''}.`);

  // Random chance of a new sponsor offer once fame is high enough and slots are free.
  if (fighter.fame >= 15 && fighter.sponsors.length < 3 && Math.random() < 0.12) {
    return generateSponsorOffer(fighter);
  }
  return null;
}

export function generateSponsorOffer(fighter) {
  const name = SPONSOR_NAMES[Math.floor(Math.random() * SPONSOR_NAMES.length)];
  const weeklyIncome = Math.round(20 * (1 + fighter.fame / 20) * (0.7 + Math.random() * 0.6));
  return { name, weeklyIncome, weeksLeft: 12 };
}

export function payoutFight(fighter, offer, won, method) {
  let total = offer.purse;
  let bonus = 0;
  if (won) {
    total += offer.winBonus;
    if (method === 'KO/TKO' || method === 'Poddanie') bonus = Math.round(offer.purse * 0.15);
    total += bonus;
  }
  fighter.money += total;

  const fameGain = won ? clamp(3 + offer.orgTier * 1.5 + (bonus > 0 ? 2 : 0), 1, 15) : clamp(1 + offer.orgTier * 0.5, 0.5, 5);
  fighter.fame = clamp(fighter.fame + (won ? fameGain : -fameGain * 0.5), 0, 100);
  fighter.socialFollowers += Math.round(fameGain * (won ? 40 : 10));

  return { total, bonus };
}
