import { pad2 } from '../utils/time.js';

export class DigitalClock {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'digital-clock';
    this._display = document.createElement('span');
    this._display.className = 'digital-time';
    this.el.appendChild(this._display);
  }

  update({ hours, minutes }) {
    this._display.textContent = `${pad2(hours)}:${pad2(minutes)}`;
  }
}
