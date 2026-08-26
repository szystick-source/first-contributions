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

// Organization ladder: player climbs from a regional promotion all the way to
// the UFC, fighting into each org's rankings from the bottom every time they
// get signed by the next tier up. Real promotion names -- small non-commercial
// fan project, no assets/branding used, just the names for flavor.
export const ORGANIZATIONS = [
  { id: 'cw', name: 'Cage Warriors', tier: 1, basePurse: 500, rosterSize: 10 },
  { id: 'lfa', name: 'LFA', tier: 2, basePurse: 2200, rosterSize: 10 },
  { id: 'bellator', name: 'Bellator', tier: 3, basePurse: 9000, rosterSize: 10 },
  { id: 'one', name: 'ONE Championship', tier: 4, basePurse: 22000, rosterSize: 10 },
  { id: 'ufc', name: 'UFC', tier: 5, basePurse: 60000, rosterSize: 12 },
];

export function nextOrganization(orgId) {
  const i = ORGANIZATIONS.findIndex((o) => o.id === orgId);
  return i >= 0 && i < ORGANIZATIONS.length - 1 ? ORGANIZATIONS[i + 1] : null;
}

export function getOrganization(orgId) {
  return ORGANIZATIONS.find((o) => o.id === orgId) || ORGANIZATIONS[0];
}

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
