import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { holdButton, tapShield, HOLD_MS, TAP_SHIELD_MS } from '../src/utils/hold-button.js';

describe('holdButton', () => {
  let onConfirm;

  beforeEach(() => {
    vi.useFakeTimers();
    onConfirm = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const make = (opts) => holdButton('Controleer', onConfirm, opts);

  it('confirms after the pointer is held for the full hold time', () => {
    const { el } = make();
    el.dispatchEvent(new Event('pointerdown'));
    expect(onConfirm).not.toHaveBeenCalled();
    vi.advanceTimersByTime(HOLD_MS);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not confirm on a short tap', () => {
    const { el } = make();
    el.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(HOLD_MS / 2);
    el.dispatchEvent(new Event('pointerup'));
    vi.advanceTimersByTime(HOLD_MS * 2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows a hint after a too-short tap and clears it again', () => {
    const { el, hint } = make();
    el.dispatchEvent(new Event('pointerdown'));
    el.dispatchEvent(new Event('pointerup'));
    expect(hint.textContent).not.toBe('');
    vi.advanceTimersByTime(5000);
    expect(hint.textContent).toBe('');
  });

  it('does not show the hint when the pointer is cancelled (e.g. scroll)', () => {
    const { el, hint } = make();
    el.dispatchEvent(new Event('pointerdown'));
    el.dispatchEvent(new Event('pointercancel'));
    expect(hint.textContent).toBe('');
    vi.advanceTimersByTime(HOLD_MS * 2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('toggles the holding class for the fill animation', () => {
    const { el } = make();
    el.dispatchEvent(new Event('pointerdown'));
    expect(el.classList.contains('btn--holding')).toBe(true);
    el.dispatchEvent(new Event('pointerup'));
    expect(el.classList.contains('btn--holding')).toBe(false);
  });

  it('confirms immediately on keyboard activation (click with detail 0)', () => {
    const { el } = make();
    el.dispatchEvent(new MouseEvent('click', { detail: 0 }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('ignores pointer-generated clicks (detail > 0)', () => {
    const { el } = make();
    el.dispatchEvent(new MouseEvent('click', { detail: 1 }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms at most once', () => {
    const { el } = make();
    el.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(HOLD_MS);
    el.dispatchEvent(new MouseEvent('click', { detail: 0 }));
    el.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(HOLD_MS);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('respects a custom hold duration', () => {
    const { el } = make({ holdMs: 1000 });
    el.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(HOLD_MS);
    expect(onConfirm).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000 - HOLD_MS);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('tapShield', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ignores pointer clicks during the guard window', () => {
    const onClick = vi.fn();
    const handler = tapShield(onClick);
    handler({ detail: 1 });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('accepts pointer clicks after the guard window', () => {
    const onClick = vi.fn();
    const handler = tapShield(onClick);
    vi.advanceTimersByTime(TAP_SHIELD_MS);
    handler({ detail: 1 });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('always accepts keyboard clicks (detail 0)', () => {
    const onClick = vi.fn();
    const handler = tapShield(onClick);
    handler({ detail: 0 });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
