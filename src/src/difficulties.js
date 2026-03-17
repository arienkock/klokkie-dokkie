const randomHour12 = () => Math.floor(Math.random() * 12) + 1;
const randomHour24 = () => Math.floor(Math.random() * 23) + 1;
const randomMultipleOf5 = (max) => Math.floor(Math.random() * (max / 5 + 1)) * 5;

export const MINUTE_LEVELS = [
  {
    id: 1,
    label: 'Volle uren',
    sublabel: 'Alleen hele uren',
    minuteHandFree: false,
    minuteSnap: 1,
    initialEditTime: { hours: 1, minutes: 0 },
    randomMinutes: () => 0,
  },
  {
    id: 2,
    label: 'Tot half',
    sublabel: 'Veelvouden van 5, tot en met half',
    minuteHandFree: true,
    minuteSnap: 5,
    initialEditTime: { hours: 12, minutes: 0 },
    randomMinutes: () => randomMultipleOf5(30),
  },
  {
    id: 3,
    label: 'Vijf minuten',
    sublabel: 'Veelvouden van 5 minuten',
    minuteHandFree: true,
    minuteSnap: 5,
    initialEditTime: { hours: 12, minutes: 0 },
    randomMinutes: () => randomMultipleOf5(55),
  },
  {
    id: 4,
    label: 'Vrij',
    sublabel: 'Alle minuten',
    minuteHandFree: true,
    minuteSnap: 1,
    initialEditTime: { hours: 12, minutes: 0 },
    randomMinutes: () => Math.floor(Math.random() * 60),
  },
];

export const HOUR_MODES = [
  {
    id: '12h',
    label: '12-uurs',
    sublabel: 'Uren van 1 tot 12',
    randomHour: randomHour12,
  },
  {
    id: '24h',
    label: '24-uurs',
    sublabel: 'Uren van 1 tot 23',
    randomHour: randomHour24,
  },
];

export const getMinuteLevel = (id) => MINUTE_LEVELS.find(l => l.id === id);
export const getHourMode = (id) => HOUR_MODES.find(m => m.id === id);

// Ordered progression for adaptive mode: minute levels × hour modes
export const ADAPTIVE_LEVELS = MINUTE_LEVELS.flatMap(ml =>
  HOUR_MODES.map(hm => ({ minuteLevelId: ml.id, hourModeId: hm.id }))
);

export const getDifficulty = (minuteLevelId, hourModeId) => {
  const ml = getMinuteLevel(minuteLevelId);
  const hm = getHourMode(hourModeId);
  return {
    minuteHandFree: ml.minuteHandFree,
    minuteSnap: ml.minuteSnap,
    initialEditTime: ml.initialEditTime,
    randomTime: () => ({ hours: hm.randomHour(), minutes: ml.randomMinutes() }),
  };
};
