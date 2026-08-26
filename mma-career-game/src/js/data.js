// Static game data: weight classes, organizations, archetypes, name pools.

export const WEIGHT_CLASSES = [
  { id: 'fly', name: 'Waga musza', limitKg: 57 },
  { id: 'bantam', name: 'Waga kogucia', limitKg: 61 },
  { id: 'feather', name: 'Waga piórkowa', limitKg: 66 },
  { id: 'light', name: 'Waga lekka', limitKg: 70 },
  { id: 'welter', name: 'Waga półśrednia', limitKg: 77 },
  { id: 'middle', name: 'Waga średnia', limitKg: 84 },
  { id: 'light-heavy', name: 'Waga półciężka', limitKg: 93 },
  { id: 'heavy', name: 'Waga ciężka', limitKg: 120 },
];

// Organization tiers: player climbs from regional shows up to the premier org.
export const ORGANIZATIONS = [
  { id: 'reg', name: 'Regional Fight Night', tier: 1, minFame: 0, basePurse: 400 },
  { id: 'nat', name: 'National Cage Series', tier: 2, minFame: 20, basePurse: 2000 },
  { id: 'elite', name: 'Elite Combat League', tier: 3, minFame: 45, basePurse: 8000 },
  { id: 'gfc', name: 'Global Fighting Championship', tier: 4, minFame: 70, basePurse: 35000 },
];

export const ARCHETYPES = {
  striker: {
    label: 'Bokser / Kickbokser (Striker)',
    base: { striking: 55, grappling: 30, wrestling: 30, cardio: 45, chin: 45, power: 55, speed: 50 },
  },
  grappler: {
    label: 'Jiu-Jitsu (Grapler)',
    base: { striking: 30, grappling: 60, wrestling: 40, cardio: 45, chin: 40, power: 40, speed: 45 },
  },
  wrestler: {
    label: 'Zapasy (Wrestler)',
    base: { striking: 30, grappling: 40, wrestling: 60, cardio: 50, chin: 45, power: 45, speed: 45 },
  },
  balanced: {
    label: 'Wszechstronny (All-rounder)',
    base: { striking: 42, grappling: 42, wrestling: 42, cardio: 42, chin: 42, power: 42, speed: 42 },
  },
};

export const NATIONALITIES = [
  'Polska', 'USA', 'Brazylia', 'Rosja', 'Kanada', 'Irlandia', 'Kazachstan', 'Nigeria', 'Francja', 'Japonia',
];

export const FIRST_NAMES = [
  'Adam', 'Marek', 'Kuba', 'Igor', 'Damian', 'Rafał', 'Bartek', 'Tomasz', 'Michael', 'John',
  'Carlos', 'Diego', 'Ivan', 'Sergei', 'Kenji', 'Ryota', 'Amara', 'Chidi', 'Liam', 'Connor',
];

export const LAST_NAMES = [
  'Kowalski', 'Nowak', 'Wiśniewski', 'Silva', 'Santos', 'Petrov', 'Ivanov', 'Murphy', 'O\'Brien',
  'Smith', 'Johnson', 'Tanaka', 'Suzuki', 'Adeyemi', 'Okafor', 'Dubois', 'Martin', 'Garcia',
];

export const SKILL_KEYS = ['striking', 'grappling', 'wrestling', 'cardio', 'chin', 'power', 'speed'];

export const SKILL_LABELS = {
  striking: 'Uderzanie',
  grappling: 'Walka w parterze',
  wrestling: 'Obalenia / zapasy',
  cardio: 'Kondycja',
  chin: 'Wytrzymałość na ciosy',
  power: 'Siła uderzenia',
  speed: 'Szybkość',
};
