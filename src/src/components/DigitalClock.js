import { pad2 } from '../utils/time.js';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export class DigitalClock {
  constructor({ editable = false } = {}) {
    this._hours = 0;
    this._minutes = 0;
    this._editable = editable;
    this._handler = null;
    this.el = document.createElement('div');
    this.el.className = 'digital-clock' + (editable ? ' digital-clock--editable' : '');
    this._build();
  }

  _build() {
    if (this._editable) {
      this._buildEditable();
    } else {
      this._display = document.createElement('span');
      this._display.className = 'digital-time';
      this.el.appendChild(this._display);
    }
  }

  _buildEditable() {
    const makeCol = (ariaUp, ariaDown, onUp, onDown) => {
      const col = document.createElement('div');
      col.className = 'digit-col';

      const up = document.createElement('button');
      up.type = 'button';
      up.className = 'digit-btn';
      up.setAttribute('aria-label', ariaUp);
      up.textContent = '▲';
      up.addEventListener('click', () => { onUp(); this._emit(); });

      const val = document.createElement('span');
      val.className = 'digit-val';

      const dn = document.createElement('button');
      dn.type = 'button';
      dn.className = 'digit-btn';
      dn.setAttribute('aria-label', ariaDown);
      dn.textContent = '▼';
      dn.addEventListener('click', () => { onDown(); this._emit(); });

      col.appendChild(up);
      col.appendChild(val);
      col.appendChild(dn);
      return { col, val };
    };

    const { col: c1, val: v1 } = makeCol(
      'uren tientallen verhogen', 'uren tientallen verlagen',
      () => { this._hours = clamp(this._hours + 10, 0, 23); },
      () => { this._hours = clamp(this._hours - 10, 0, 23); }
    );
    const { col: c2, val: v2 } = makeCol(
      'uren eenheden verhogen', 'uren eenheden verlagen',
      () => { this._hours = (this._hours + 1) % 24; },
      () => { this._hours = (this._hours + 23) % 24; }
    );

    const sep = document.createElement('span');
    sep.className = 'digit-sep';
    sep.textContent = ':';

    const { col: c3, val: v3 } = makeCol(
      'minuten tientallen verhogen', 'minuten tientallen verlagen',
      () => { this._minutes = clamp(this._minutes + 10, 0, 59); },
      () => { this._minutes = clamp(this._minutes - 10, 0, 59); }
    );
    const { col: c4, val: v4 } = makeCol(
      'minuten eenheden verhogen', 'minuten eenheden verlagen',
      () => { this._minutes = (this._minutes + 1) % 60; },
      () => { this._minutes = (this._minutes + 59) % 60; }
    );

    this._digits = [v1, v2, v3, v4];

    const row = document.createElement('div');
    row.className = 'digit-row';
    row.appendChild(c1);
    row.appendChild(c2);
    row.appendChild(sep);
    row.appendChild(c3);
    row.appendChild(c4);
    this.el.appendChild(row);
  }

  _emit() {
    this._renderDisplay();
    this._handler?.({ hours: this._hours, minutes: this._minutes });
  }

  _renderDisplay() {
    if (this._editable) {
      const h = pad2(this._hours);
      const m = pad2(this._minutes);
      this._digits[0].textContent = h[0];
      this._digits[1].textContent = h[1];
      this._digits[2].textContent = m[0];
      this._digits[3].textContent = m[1];
    } else {
      this._display.textContent = `${pad2(this._hours)}:${pad2(this._minutes)}`;
    }
  }

  update({ hours, minutes }) {
    this._hours = hours;
    this._minutes = minutes;
    this._renderDisplay();
  }

  onChange(fn) { this._handler = fn; }
}
