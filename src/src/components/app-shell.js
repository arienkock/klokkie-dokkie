import './app-card.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--sl-spacing-x-large, 2rem);
      padding-bottom: var(--sl-spacing-medium, 1rem);
      border-bottom: 2px solid var(--sl-color-primary-600, #2563eb);
    }
    h1 {
      margin: 0;
      font-size: var(--sl-font-size-x-large, 1.5rem);
      font-weight: var(--sl-font-weight-bold, 700);
    }
    .content {
      display: grid;
      gap: var(--sl-spacing-large, 1.5rem);
    }
  </style>
  <header>
    <h1><slot name="title">App</slot></h1>
    <slot name="actions"></slot>
  </header>
  <main class="content">
    <slot></slot>
  </main>
`;

class AppShell extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }
}

customElements.define('app-shell', AppShell);

export { AppShell };
