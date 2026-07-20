import { clockDomain, engine } from './domains/clock/index.js';
import { createPracticeApp } from './core/shell/index.js';

createPracticeApp({ domain: clockDomain, engine, mount: document.getElementById('app'), storage: localStorage });
