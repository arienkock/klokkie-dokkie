import { LitElement, html } from 'lit'
import { emit } from '../utils/dom.js'

class AppButton extends LitElement {
  static properties = {
    label: { type: String },
    variant: { type: String },
    disabled: { type: Boolean },
  }

  constructor() {
    super()
    this.label = ''
    this.variant = 'primary'
    this.disabled = false
  }

  createRenderRoot() {
    return this
  }

  #handleClick() {
    if (!this.disabled) {
      emit(this, 'app-click', { label: this.label })
    }
  }

  render() {
    return html`
      <button
        class="${this.variant}"
        ?disabled=${this.disabled}
        @click=${this.#handleClick}
      >
        <slot>${this.label}</slot>
      </button>
    `
  }
}

customElements.define('app-button', AppButton)
