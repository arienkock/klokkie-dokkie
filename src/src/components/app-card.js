import { emit } from '../utils/dom.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
    }
    .card {
      background: var(--sl-color-neutral-0, #fff);
      border: 1px solid var(--sl-color-neutral-200, #e2e8f0);
      border-radius: var(--sl-border-radius-large, 8px);
      padding: var(--sl-spacing-large, 1.5rem);
      box-shadow: var(--sl-shadow-small);
    }
    ::slotted([slot="header"]) {
      margin: 0 0 var(--sl-spacing-medium, 1rem);
    }
    ::slotted([slot="footer"]) {
      margin: var(--sl-spacing-medium, 1rem) 0 0;
      padding-top: var(--sl-spacing-medium, 1rem);
      border-top: 1px solid var(--sl-color-neutral-100, #f1f5f9);
    }
  </style>
  <div class="card">
    <slot name="header"></slot>
    <slot></slot>
    <slot name="footer"></slot>
  </div>
`;

class AppCard extends HTMLElement {
  static get observedAttributes() {
    return ['label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  get label() {
    return this.getAttribute('label');
  }

  set label(value) {
    this.setAttribute('label', value);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'label' && oldValue !== newValue) {
      emit(this, 'app-card:label-change', { label: newValue });
    }
  }
}

customElements.define('app-card', AppCard);

export { AppCard };
