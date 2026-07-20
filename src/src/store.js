// Thin clock wrapper over the domain-agnostic core game (transitional).
export { createStore, SESSION_NOMINAL, SESSION_CAP } from './core/game/index.js';
import { createGame } from './core/game/index.js';
import { clockDomain, engine } from './domains/clock/index.js';

export const createGameStore = () => createGame({ engine, domain: clockDomain, storage: localStorage });
