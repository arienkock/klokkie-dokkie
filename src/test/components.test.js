import { describe, it, expect, beforeAll, beforeEach } from 'vitest'

describe('app-button', () => {
  beforeAll(async () => {
    await import('../src/components/app-button.js')
  })

  it('registers as a custom element', () => {
    expect(customElements.get('app-button')).toBeDefined()
  })

  it('has default property values', () => {
    const el = document.createElement('app-button')
    expect(el.label).toBe('')
    expect(el.variant).toBe('primary')
    expect(el.disabled).toBe(false)
  })

  it('reflects label attribute to property', () => {
    const el = document.createElement('app-button')
    el.setAttribute('label', 'Click me')
    expect(el.getAttribute('label')).toBe('Click me')
  })
})

describe('app-card', () => {
  beforeAll(async () => {
    await import('../src/components/app-card.js')
  })

  it('registers as a custom element', () => {
    expect(customElements.get('app-card')).toBeDefined()
  })

  it('has default heading of empty string', () => {
    const el = document.createElement('app-card')
    expect(el.heading).toBe('')
  })
})

describe('app-shell', () => {
  beforeAll(async () => {
    await import('../src/components/app-shell.js')
  })

  it('registers as a custom element', () => {
    expect(customElements.get('app-shell')).toBeDefined()
  })
})
