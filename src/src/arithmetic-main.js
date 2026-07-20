// Dev-only demo entry: serve the arithmetic domain through the core shell via
// `vite dev` (not part of the production build inputs). Validates the shell
// renders a non-clock domain.
import { arithmeticDomain, engine } from './domains/arithmetic/index.js';
import { createPracticeApp } from './core/shell/index.js';

createPracticeApp({ domain: arithmeticDomain, engine, mount: document.getElementById('app'), storage: localStorage });
