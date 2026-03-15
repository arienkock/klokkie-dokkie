import { describe, it, expect, beforeEach } from 'vitest'
import { qs, qsa, emit } from '../src/utils/dom.js'

describe('qs', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('returns the first matching element', () => {
    document.body.innerHTML = '<div class="target"></div>'
    expect(qs('.target')).toBeInstanceOf(Element)
  })

  it('returns null when no match', () => {
    expect(qs('.missing')).toBeNull()
  })

  it('searches within a given root', () => {
    document.body.innerHTML = '<div id="scope"><span class="inner"></span></div>'
    const scope = qs('#scope')
    expect(qs('.inner', scope)).toBeInstanceOf(Element)
  })
})

describe('qsa', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('returns all matching elements as an array', () => {
    document.body.innerHTML = '<div class="item"></div><div class="item"></div>'
    expect(qsa('.item')).toHaveLength(2)
  })

  it('returns an empty array when no matches', () => {
    expect(qsa('.missing')).toEqual([])
  })
})

describe('emit', () => {
  it('dispatches a custom event with detail', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    let received = null
    el.addEventListener('test-event', (e) => {
      received = e.detail
    })
    emit(el, 'test-event', { value: 42 })
    expect(received).toEqual({ value: 42 })
  })

  it('bubbles by default', () => {
    const parent = document.createElement('div')
    const child = document.createElement('div')
    parent.appendChild(child)
    document.body.appendChild(parent)
    let bubbled = false
    parent.addEventListener('bubble-test', () => {
      bubbled = true
    })
    emit(child, 'bubble-test')
    expect(bubbled).toBe(true)
  })
})
