import { timeToZin, zinToWords, generateTray } from '../utils/zinnen.js';

export class SentenceClock {
  constructor({ editable = false } = {}) {
    this._editable = editable;
    this._handler = null;
    this._hours = 12;
    this._minutes = 0;
    this._correctWords = [];
    this._trayPool = [];
    this._placed = [];
    this._dragging = null;
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

      if (placed) {
        slot.textContent = placed.word;
        slot.draggable = true;
        slot.addEventListener('dragstart', e => {
          this._dragging = { item: placed, fromSlot: i };
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', '');
          requestAnimationFrame(() => slot.classList.add('dragging'));
        });
        slot.addEventListener('dragend', () => slot.classList.remove('dragging'));
        slot.addEventListener('dblclick', () => this._removeFromSlot(i));
      }

      slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('drag-over'); });
      slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
      slot.addEventListener('drop', e => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        if (!this._dragging) return;
        const { item, fromSlot } = this._dragging;
        this._dragging = null;
        this._placeInSlot(i, item, fromSlot);
      });

      slotsEl.appendChild(slot);
    });

    const trayEl = document.createElement('div');
    trayEl.className = 'word-tray';
    trayEl.addEventListener('dragover', e => e.preventDefault());
    trayEl.addEventListener('drop', e => {
      e.preventDefault();
      if (!this._dragging) return;
      const { fromSlot } = this._dragging;
      this._dragging = null;
      if (fromSlot !== null) this._removeFromSlot(fromSlot);
    });

    this._trayItems().forEach(item => {
      const block = document.createElement('div');
      block.className = 'word-block';
      block.textContent = item.word;
      block.draggable = true;
      block.addEventListener('dragstart', e => {
        this._dragging = { item, fromSlot: null };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
        requestAnimationFrame(() => block.classList.add('dragging'));
      });
      block.addEventListener('dragend', () => block.classList.remove('dragging'));
      block.addEventListener('dblclick', () => this._placeInFirstEmpty(item, null));
      trayEl.appendChild(block);
    });

    this.el.appendChild(slotsEl);
    this.el.appendChild(trayEl);
  }

  onChange(fn) { this._handler = fn; }
  destroy() {}
}
