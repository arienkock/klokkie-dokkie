import { describe, it, expect, beforeEach } from 'vitest';
import { AppCard } from '../src/components/app-card.js';

describe('AppCard', () => {
  let el;

  beforeEach(() => {
    el = document.createElement('app-card');
    document.body.appendChild(el);
  });

  it('is defined as a custom element', () => {
    expect(customElements.get('app-card')).toBeDefined();
  });

  it('has a shadow root', () => {
    expect(el.shadowRoot).not.toBeNull();
  });

  it('reflects label attribute via property', () => {
    el.setAttribute('label', 'test-label');
    expect(el.label).toBe('test-label');
  });

  it('reflects label property to attribute', () => {
    el.label = 'hello';
    expect(el.getAttribute('label')).toBe('hello');
  });

  it('emits label-change event when label changes', () => {
    let detail = null;
    el.addEventListener('app-card:label-change', (e) => { detail = e.detail; });
    el.label = 'updated';
    expect(detail).toEqual({ label: 'updated' });
  });
});
