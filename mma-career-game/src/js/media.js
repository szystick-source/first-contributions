import { clamp } from './fighter.js';

// Post-fight interview: player picks a response tone, affecting fame/morale/rivalry.
export function postFightInterviewOptions(won, opponentName) {
  if (won) {
    return [
      { id: 'humble', label: `Pochwal ${opponentName} i zachowaj skromność`, fame: 2, morale: 3, rivalry: 0 },
      { id: 'hype', label: 'Zbuduj hype wokół siebie', fame: 5, morale: 1, rivalry: 0 },
      { id: 'trashtalk', label: `Obraź ${opponentName} przed kamerami`, fame: 4, morale: -2, rivalry: 8 },
    ];
  }
  return [
    { id: 'respect', label: `Uznaj wyższość ${opponentName}`, fame: 1, morale: -1, rivalry: 0 },
    { id: 'excuse', label: 'Szukaj wymówek (kontuzja, sędziowanie)', fame: -2, morale: 2, rivalry: 3 },
    { id: 'revenge', label: 'Zapowiedz rewanż', fame: 2, morale: 4, rivalry: 6 },
  ];
}

export function applyMediaChoice(fighter, choice) {
  fighter.fame = clamp(fighter.fame + choice.fame, 0, 100);
  fighter.morale = clamp(fighter.morale + choice.morale, 0, 100);
  fighter.socialFollowers += Math.round(choice.fame * 30);
}

const PERSONAL_EVENTS = [
  {
    id: 'family_support',
    text: 'Rodzina odwiedza Cię przed ważnym tygodniem treningowym.',
    options: [
      { label: 'Spędź z nimi czas (odpoczynek)', morale: 8, fatigueDelta: -10 },
      { label: 'Skup się na treningu', morale: -3, fatigueDelta: 0 },
    ],
  },
  {
    id: 'controversy',
    text: 'Kontrowersyjny wpis w mediach społecznościowych na Twój temat zaczyna krążyć w sieci.',
    options: [
      { label: 'Odpowiedz stanowczo publicznie', fame: 4, morale: -4 },
      { label: 'Zignoruj temat', fame: -1, morale: 1 },
    ],
  },
  {
    id: 'injury_scare',
    text: 'Dziennikarz pyta wprost o Twoją formę zdrowotną po ostatnich doniesieniach.',
    options: [
      { label: 'Zapewnij, że jesteś w pełni gotowy', fame: 2, morale: 2 },
      { label: 'Przyznaj się do wątpliwości', fame: -2, morale: -1 },
    ],
  },
  {
    id: 'charity',
    text: 'Otrzymujesz zaproszenie na wydarzenie charytatywne.',
    options: [
      { label: 'Weź udział (buduje wizerunek)', fame: 3, morale: 3, fatigueDelta: 5 },
      { label: 'Odmów, skup się na przygotowaniach', fame: -1, morale: 0 },
    ],
  },
];

export function maybeGeneratePersonalEvent(chance = 0.18) {
  if (Math.random() > chance) return null;
  return PERSONAL_EVENTS[Math.floor(Math.random() * PERSONAL_EVENTS.length)];
}

export function applyPersonalEventChoice(fighter, option) {
  if (option.fame) fighter.fame = clamp(fighter.fame + option.fame, 0, 100);
  if (option.morale) fighter.morale = clamp(fighter.morale + option.morale, 0, 100);
  if (option.fatigueDelta) fighter.fatigue = clamp(fighter.fatigue + option.fatigueDelta, 0, 100);
}
