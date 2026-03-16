const randomHour = () => Math.floor(Math.random() * 12) + 1;

const randomMultipleOf5 = (max) => Math.floor(Math.random() * (max / 5 + 1)) * 5;

export const DIFFICULTIES = [
  {
    id: 1,
    label: 'Volle uren',
    sublabel: 'Alleen hele uren',
    minuteHandFree: false,
    initialEditTime: { hours: 1, minutes: 0 },
    randomTime: () => ({ hours: randomHour(), minutes: 0 }),
  },
  {
    id: 2,
    label: 'Tot half',
    sublabel: 'Veelvouden van 5, tot en met half',
    minuteHandFree: true,
    initialEditTime: { hours: 12, minutes: 0 },
    randomTime: () => ({ hours: randomHour(), minutes: randomMultipleOf5(30) }),
  },
  {
    id: 3,
    label: 'Vijf minuten',
    sublabel: 'Veelvouden van 5 minuten',
    minuteHandFree: true,
    initialEditTime: { hours: 12, minutes: 0 },
    randomTime: () => ({ hours: randomHour(), minutes: randomMultipleOf5(55) }),
  },
  {
    id: 4,
    label: 'Vrij',
    sublabel: 'Alle minuten',
    minuteHandFree: true,
    initialEditTime: { hours: 12, minutes: 0 },
    randomTime: () => ({ hours: Math.floor(Math.random() * 24), minutes: Math.floor(Math.random() * 60) }),
  },
];

export const getDifficulty = (id) => DIFFICULTIES.find(d => d.id === id);
