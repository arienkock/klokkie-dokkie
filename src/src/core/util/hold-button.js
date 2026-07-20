import { createElement } from './dom.js';

// Guards against accidental taps by small children: grading a question is
// irreversible, so the check button must be *held* rather than tapped, and
// buttons that appear under a finger mid-tap ignore pointer clicks briefly.
// Keyboard/assistive-tech activation (click with detail 0) always works
// immediately — stray taps are a touch-screen problem.

export const HOLD_MS = 600;
export const TAP_SHIELD_MS = 500;
const HINT_MS = 2000;

// A primary button that confirms only after being held for `holdMs`, with a
// fill animation showing progress. A too-short tap does nothing except show
// `hintText` in the returned hint element (place it near the button).
export function holdButton(label, onConfirm, { holdMs = HOLD_MS, hintText = 'Houd de knop even ingedrukt' } = {}) {
  const fill = createElement('span', { class: 'btn-hold__fill', 'aria-hidden': 'true' });
  const el = createElement(
    'button',
    { class: 'btn btn--primary btn--hold', type: 'button' },
    fill,
    createElement('span', { class: 'btn-hold__label' }, label)
  );
  el.style.setProperty('--hold-ms', `${holdMs}ms`);
  const hint = createElement('span', { class: 'hold-hint', role: 'status' });

  let timer = null;
  let hintTimer = null;
  let fired = false;

  const confirm = () => {
    if (fired) return;
    fired = true;
    onConfirm();
  };

  const start = (event) => {
    if (fired || timer !== null) return;
    if (event.pointerId !== undefined && typeof el.setPointerCapture === 'function') {
      try { el.setPointerCapture(event.pointerId); } catch {}
    }
    clearTimeout(hintTimer);
    hint.textContent = '';
    el.classList.add('btn--holding');
    timer = setTimeout(() => {
      timer = null;
      el.classList.remove('btn--holding');
      confirm();
    }, holdMs);
  };

  const cancel = (tooShort) => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
    el.classList.remove('btn--holding');
    if (tooShort) {
      hint.textContent = hintText;
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => { hint.textContent = ''; }, HINT_MS);
    }
  };

  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', () => cancel(true));
  el.addEventListener('pointercancel', () => cancel(false));
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('click', (e) => { if (e.detail === 0) confirm(); });

  return { el, hint };
}

// Wrap a click handler so pointer clicks are ignored for the first `guardMs`
// after creation. For buttons that render at the spot where the finger
// already is (e.g. "Volgende" replacing the check button), so a habitual
// double-tap can't activate them by accident.
export function tapShield(onClick, guardMs = TAP_SHIELD_MS) {
  const armAt = Date.now() + guardMs;
  return (event) => {
    if (event.detail !== 0 && Date.now() < armAt) return;
    onClick(event);
  };
}
