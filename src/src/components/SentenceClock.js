import { timeToZin, zinToWords, generateTray } from '../utils/zinnen.js';

const DOUBLE_TAP_MS = 300;
const DRAG_THRESHOLD = 5;

export class SentenceClock {
  constructor({ editable = false } = {}) {
    this._editable = editable;
    this._handler = null;
    this._hours = 12;
    this._minutes = 0;
    this._correctWords = [];
    this._trayPool = [];
    this._placed = [];
    this.el = document.createElement('div');
    this.el.className = 'sentence-clock' + (editable ? ' sentence-clock--editable' : '');
  }

  update({ hours, minutes }) {
    this._hours = hours;
    this._minutes = minutes;
    if (this._editable) {
      const zin = timeToZin(hours, minutes);
      this._correctWords = zinToWords(zin);
      const trayWords = generateTray(this._correctWords);
      this._trayPool = trayWords.map((word, id) => ({ id, word }));
      this._placed = new Array(this._correctWords.length).fill(null);
    }
    this._render();
  }

  _trayItems() {
    const placedIds = new Set(this._placed.filter(Boolean).map(p => p.id));
    return this._trayPool.filter(item => !placedIds.has(item.id));
  }

  _placeInSlot(slotIdx, item, fromSlot) {
    if (fromSlot !== null) this._placed[fromSlot] = null;
    this._placed[slotIdx] = item;
    this._render();
    this._checkComplete();
  }

  _removeFromSlot(slotIdx) {
    this._placed[slotIdx] = null;
    this._render();
  }

  _placeInFirstEmpty(item, fromSlot) {
    const idx = this._placed.findIndex(p => p === null);
    if (idx === -1) return;
    if (fromSlot !== null) this._placed[fromSlot] = null;
    this._placed[idx] = item;
    this._render();
    this._checkComplete();
  }

  _checkComplete() {
    if (this._placed.some(p => p === null)) return;
    const correct = this._placed.every((p, i) => p.word === this._correctWords[i]);
    if (correct) {
      this._handler?.({ hours: this._hours, minutes: this._minutes });
    } else {
      this._showWrong();
    }
  }

  _showWrong() {
    this.el.querySelectorAll('.word-slot--filled').forEach(el => el.classList.add('word-slot--wrong'));
    setTimeout(() => {
      this._placed = new Array(this._correctWords.length).fill(null);
      this._render();
    }, 600);
  }

  _hitTest(x, y) {
    for (const el of document.elementsFromPoint(x, y)) {
      if (el.classList.contains('word-slot')) return el;
      if (el.classList.contains('word-tray')) return el;
    }
    return null;
  }

  _bindInteraction(el, item, fromSlot) {
    let lastTap = 0;

    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastTap < DOUBLE_TAP_MS) {
        lastTap = 0;
        if (fromSlot !== null) this._removeFromSlot(fromSlot);
        else this._placeInFirstEmpty(item, null);
        return;
      }
      lastTap = now;

      const rect = el.getBoundingClientRect();
      const ox = e.clientX - rect.left;
      const oy = e.clientY - rect.top;
      const startX = e.clientX;
      const startY = e.clientY;
      let ghost = null;
      let dragging = false;

      const startGhost = (cx, cy) => {
        dragging = true;
        ghost = el.cloneNode(true);
        ghost.className = ghost.className + ' word-ghost';
        ghost.style.cssText = [
          'position:fixed',
          'pointer-events:none',
          'z-index:9999',
          `left:${cx - ox}px`,
          `top:${cy - oy}px`,
          `width:${rect.width}px`,
          'margin:0',
          'opacity:0.85',
        ].join(';');
        document.body.appendChild(ghost);
        el.classList.add('dragging');
      };

      const clearHighlights = () =>
        this.el.querySelectorAll('.drag-over').forEach(t => t.classList.remove('drag-over'));

      const onMove = ev => {
        if (!dragging) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > DRAG_THRESHOLD) {
            startGhost(ev.clientX, ev.clientY);
          }
          return;
        }
        ghost.style.left = `${ev.clientX - ox}px`;
        ghost.style.top = `${ev.clientY - oy}px`;
        clearHighlights();
        const target = this._hitTest(ev.clientX, ev.clientY);
        if (target) target.classList.add('drag-over');
      };

      const cleanup = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onEnd);
        document.removeEventListener('pointercancel', onEnd);
        ghost?.remove();
        el.classList.remove('dragging');
        clearHighlights();
      };

      const onEnd = ev => {
        cleanup();
        if (!dragging) return;
        const target = this._hitTest(ev.clientX, ev.clientY);
        if (!target) return;
        if (target.classList.contains('word-tray')) {
          if (fromSlot !== null) this._removeFromSlot(fromSlot);
        } else if (target.classList.contains('word-slot')) {
          const idx = parseInt(target.dataset.slot, 10);
          this._placeInSlot(idx, item, fromSlot);
        }
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onEnd);
      document.addEventListener('pointercancel', onEnd);
    });
  }

  _render() {
    this.el.innerHTML = '';
    if (!this._editable) {
      const span = document.createElement('span');
      span.className = 'sentence-text';
      span.textContent = timeToZin(this._hours, this._minutes);
      this.el.appendChild(span);
      return;
    }

    const slotsEl = document.createElement('div');
    slotsEl.className = 'sentence-slots';

    this._placed.forEach((placed, i) => {
      const slot = document.createElement('div');
      slot.className = 'word-slot' + (placed ? ' word-slot--filled' : '');
      slot.dataset.slot = String(i);

      if (placed) {
        slot.textContent = placed.word;
        this._bindInteraction(slot, placed, i);
      }

      slotsEl.appendChild(slot);
    });

    const trayEl = document.createElement('div');
    trayEl.className = 'word-tray';

    this._trayItems().forEach(item => {
      const block = document.createElement('div');
      block.className = 'word-block';
      block.textContent = item.word;
      this._bindInteraction(block, item, null);
      trayEl.appendChild(block);
    });

    this.el.appendChild(slotsEl);
    this.el.appendChild(trayEl);
  }

  onChange(fn) { this._handler = fn; }
  destroy() {}
}
