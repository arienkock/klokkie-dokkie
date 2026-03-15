import { LitElement, html } from 'lit'

class AppShell extends LitElement {
  createRenderRoot() {
    return this
  }

  render() {
    return html`
      <header class="container">
        <nav>
          <strong>App</strong>
        </nav>
      </header>
      <main class="container">
        <slot></slot>
      </main>
    `
  }
}

customElements.define('app-shell', AppShell)
