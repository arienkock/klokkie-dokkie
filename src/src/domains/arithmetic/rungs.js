// Arithmetic ladder: rungs of increasing difficulty. Each rung knows how to
// generate a concrete problem { text, answer } from an rng. Pure, no DOM.

import { pick } from '../../core/util/random.js';

// Inclusive integer in [min, max].
const randInt = (min, max, rng = Math.random) => min + Math.floor(rng() * (max - min + 1));

export const LADDER = ['add_small', 'add_large', 'sub_small', 'mul_small'];

export const RUNGS = {
  add_small: {
    id: 'add_small',
    label: 'Optellen tot 20',
    generate(rng = Math.random) {
      const a = randInt(1, 9, rng);
      const b = randInt(1, 9, rng);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  add_large: {
    id: 'add_large',
    label: 'Optellen tot 100',
    generate(rng = Math.random) {
      const a = randInt(10, 99, rng);
      const b = randInt(10, 99, rng);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  sub_small: {
    id: 'sub_small',
    label: 'Aftrekken',
    generate(rng = Math.random) {
      const a = randInt(1, 9, rng);
      const b = randInt(0, a, rng);
      return { text: `${a} - ${b}`, answer: a - b };
    },
  },
  mul_small: {
    id: 'mul_small',
    label: 'Tafels',
    generate(rng = Math.random) {
      const a = randInt(1, 9, rng);
      const b = randInt(1, 9, rng);
      return { text: `${a} × ${b}`, answer: a * b };
    },
  },
};

// Kept exported in case a domain wants a reviewable subset; also documents the
// shared random helper usage.
export { pick };
