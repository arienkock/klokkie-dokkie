import { LitElement, html } from 'lit'

class AppCard extends LitElement {
  static properties = {
    heading: { type: String },
  }

  constructor() {
    super()
    this.heading = ''
  }

  createRenderRoot() {
    return this
  }

  render() {
    return html`
      <article>
        ${this.heading ? html`<header><strong>${this.heading}</strong></header>` : ''}
        <slot></slot>
      </article>
    `
  }
}

customElements.define('app-card', AppCard)
