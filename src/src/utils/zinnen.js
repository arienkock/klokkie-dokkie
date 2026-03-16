const UURWOORDEN = ['twaalf', 'één', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien', 'elf'];

const MINUUTWOORDEN = [
  'nul', 'één', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen',
  'tien', 'elf', 'twaalf', 'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien',
  'achttien', 'negentien', 'twintig', 'eenentwintig', 'tweeëntwintig', 'drieëntwintig',
  'vierentwintig', 'vijfentwintig', 'zesentwintig', 'zevenentwintig', 'achtentwintig', 'negenentwintig',
];

const VOCAB = [...new Set([...UURWOORDEN, ...MINUUTWOORDEN.slice(1), 'over', 'voor', 'half', 'kwart', 'uur'])];

export function timeToZin(hour, minute) {
  const h = ((hour % 12) + 12) % 12;
  const next = (h + 1) % 12;
  const uur = UURWOORDEN[h];
  const nextUur = UURWOORDEN[next];

  if (minute === 0)  return `${uur} uur`;
  if (minute === 15) return `kwart over ${uur}`;
  if (minute === 30) return `half ${nextUur}`;
  if (minute === 45) return `kwart voor ${nextUur}`;
  if (minute < 15)   return `${MINUUTWOORDEN[minute]} over ${uur}`;
  if (minute < 30)   return `${MINUUTWOORDEN[30 - minute]} voor half ${nextUur}`;
  if (minute < 45)   return `${MINUUTWOORDEN[minute - 30]} over half ${nextUur}`;
  return `${MINUUTWOORDEN[60 - minute]} voor ${nextUur}`;
}

export function zinToWords(zin) {
  return zin.split(' ');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateTray(correctWords) {
  const correctSet = new Set(correctWords);
  const count = Math.min(4, Math.max(2, correctWords.length));
  const confounders = shuffle(VOCAB.filter(w => !correctSet.has(w))).slice(0, count);
  return shuffle([...correctWords, ...confounders]);
}
