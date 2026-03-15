import { describe, it, expect, beforeEach } from 'vitest';
import { qs, qsa, createElement, emit } from '../src/utils/dom.js';

describe('qs', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"><span class="item">a</span><span class="item">b</span></div>';
  });

  it('returns first matching element', () => {
    expect(qs('#root')).not.toBeNull();
  });

  it('returns null when no match', () => {
    expect(qs('.missing')).toBeNull();
  });

  it('scopes to provided root', () => {
    const root = qs('#root');
    expect(qs('.item', root)).not.toBeNull();
  });
});

describe('qsa', () => {
  beforeEach(() => {
    document.body.innerHTML = '<ul><li>1</li><li>2</li><li>3</li></ul>';
  });

  it('returns an array', () => {
    expect(Array.isArray(qsa('li'))).toBe(true);
  });

  it('returns all matching elements', () => {
    expect(qsa('li')).toHaveLength(3);
  });

  it('returns empty array when no match', () => {
    expect(qsa('.nope')).toHaveLength(0);
  });
});

describe('createElement', () => {
  it('creates element with tag name', () => {
    const el = createElement('div');
    expect(el.tagName).toBe('DIV');
  });

  it('sets attributes', () => {
    const el = createElement('input', { type: 'text', placeholder: 'Enter text' });
    expect(el.getAttribute('type')).toBe('text');
    expect(el.getAttribute('placeholder')).toBe('Enter text');
  });

  it('appends text children', () => {
    const el = createElement('p', {}, 'Hello world');
    expect(el.textContent).toBe('Hello world');
  });

  it('appends node children', () => {
    const span = document.createElement('span');
    const div = createElement('div', {}, span);
    expect(div.firstChild).toBe(span);
  });

  it('binds event listeners for on* attributes', () => {
    let clicked = false;
    const el = createElement('button', { onClick: () => { clicked = true; } });
    el.click();
    expect(clicked).toBe(true);
  });
});

describe('emit', () => {
  it('dispatches a CustomEvent with detail', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    let received = null;
    el.addEventListener('test:event', (e) => { received = e.detail; });
    emit(el, 'test:event', { value: 42 });
    expect(received).toEqual({ value: 42 });
  });

  it('bubbles by default', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    document.body.appendChild(parent);
    let bubbled = false;
    parent.addEventListener('test:bubble', () => { bubbled = true; });
    emit(child, 'test:bubble');
    expect(bubbled).toBe(true);
  });
});
