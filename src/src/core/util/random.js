export const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];
