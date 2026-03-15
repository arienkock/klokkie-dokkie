import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';

import './components/app-shell.js';
import './components/app-card.js';

setBasePath('/node_modules/@shoelace-style/shoelace/dist');

const shell = document.querySelector('app-shell');

shell.innerHTML = `
  <span slot="title">My App</span>
  <sl-button slot="actions" variant="primary" size="small">New item</sl-button>

  <app-card label="welcome">
    <h2 slot="header">Welcome</h2>
    <p>Start building your app here. This scaffold includes:</p>
    <ul>
      <li>Shoelace Web Components</li>
      <li>Custom Web Components (<code>app-shell</code>, <code>app-card</code>)</li>
      <li>DOM utilities</li>
      <li>Vitest for testing</li>
      <li>Vite dev server</li>
    </ul>
    <div slot="footer">
      <sl-badge variant="success">Ready</sl-badge>
    </div>
  </app-card>
`;
