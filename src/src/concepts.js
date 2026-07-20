// Concept ladder for adaptive difficulty. See docs/adaptive-difficulty.md.

import { pick } from './core/util/random.js';

const VRIJ_MINUTES = Array.from({ length: 60 }, (_, m) => m).filter(m => m % 5 !== 0);

export const CONCEPTS = [
  {
    id: 'heel_uur',
    label: 'Hele uren',
    minuteHandFree: false,
    minuteSnap: 1,
    initialEditTime: { hours: 1, minutes: 0 },
    randomMinutes: () => 0,
  },
  {
    id: 'half_uur',
    label: 'Halve uren',
    minuteHandFree: true,
    minuteSnap: 30,
    initialEditTime: { hours: 12, minutes: 0 },
    randomMinutes: () => 30,
  },
  {
    id: 'kwartier',
    label: 'Kwartieren',
    minuteHandFree: true,
    minuteSnap: 15,
    initialEditTime: { hours: 12, minutes: 0 },
    randomMinutes: (rng) => pick([15, 45], rng),
  },
  {
    id: 'uur_24',
    label: '24-uurs klok',
    minuteHandFree: true,
    minuteSnap: 5,
    initialEditTime: { hours: 12, minutes: 0 },
    randomMinutes: null, // minutes come from an already-mastered minute concept
  },
  {
    id: 'voor_half',
    label: 'Vijf minuten (voor half)',
    minuteHandFree: true,
    minuteSnap: 5,
    initialEditTime: { hours: 12, minutes: 0 },
    randomMinutes: (rng) => pick([5, 10, 20, 25], rng),
  },
  {
    id: 'na_half',
    label: 'Vijf minuten (na half)',
    minuteHandFree: true,
    minuteSnap: 5,
    initialEditTime: { hours: 12, minutes: 0 },
    randomMinutes: (rng) => pick([35, 40, 50, 55], rng),
  },
  {
    id: 'vrij',
    label: 'Alle minuten',
    minuteHandFree: true,
    minuteSnap: 1,
    initialEditTime: { hours: 12, minutes: 0 },
    randomMinutes: (rng) => pick(VRIJ_MINUTES, rng),
  },
];

export const REPRESENTATIONS = ['analog', 'digital', 'zin'];

const MINUTE_LADDER = ['heel_uur', 'half_uur', 'kwartier', 'voor_half', 'na_half', 'vrij'];

// The dial and the sentence vocabulary are inherently 12-hour, so only the
// digital ladder contains the uur_24 rung.
export const LADDERS = {
  analog: MINUTE_LADDER,
  digital: ['heel_uur', 'half_uur', 'kwartier', 'uur_24', 'voor_half', 'na_half', 'vrij'],
  zin: MINUTE_LADDER,
};

export const getConcept = (id) => CONCEPTS.find(c => c.id === id);

export const randomHour12 = (rng = Math.random) => Math.floor(rng() * 12) + 1;
export const randomHour24 = (rng = Math.random) => Math.floor(rng() * 11) + 13;
export const randomHourAny = (rng = Math.random) => Math.floor(rng() * 23) + 1;

export const randomMinutesFor = (conceptId, rng = Math.random) =>
  getConcept(conceptId).randomMinutes(rng);
