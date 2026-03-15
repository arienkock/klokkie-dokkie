import {
  hoursToAngle, minutesToAngle,
  angleToMinutes, angleToHours12,
  pointAngle, svgPoint, handEndpoint,
} from '../utils/time.js';

const NS = 'http://www.w3.org/2000/svg';
const CX = 100, CY = 100, R = 90;

const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

const setLine = (line, angleDeg, length) => {
  const { x, y } = handEndpoint(angleDeg, length);
  line.setAttribute('x2', x);
  line.setAttribute('y2', y);
};

export class AnalogClock {
  constructor({ showNumbers = true } = {}) {
    this._showNumbers = showNumbers;
    this._hours = 0;
    this._minutes = 0;
    this._dragging = null;
    this._handler = null;
    this._build();
    this._bindDrag();
  }

  _build() {
    this.el = svgEl('svg', { viewBox: '0 0 200 200', class: 'analog-clock' });

    this.el.appendChild(svgEl('circle', { cx: CX, cy: CY, r: R, class: 'clock-face' }));
    this.el.appendChild(svgEl('circle', { cx: CX, cy: CY, r: R, class: 'clock-rim' }));

    this._markers = svgEl('g', { class: 'markers' });
    this.el.appendChild(this._markers);

    this._minuteHand = svgEl('line', { x1: CX, y1: CY, x2: CX, y2: CY - 72, class: 'minute-hand', 'stroke-linecap': 'round' });
    this._hourHand   = svgEl('line', { x1: CX, y1: CY, x2: CX, y2: CY - 52, class: 'hour-hand',   'stroke-linecap': 'round' });
    this._minuteHit  = svgEl('line', { x1: CX, y1: CY, x2: CX, y2: CY - 72, class: 'hand-hit', 'data-hand': 'minute' });
    this._hourHit    = svgEl('line', { x1: CX, y1: CY, x2: CX, y2: CY - 52, class: 'hand-hit', 'data-hand': 'hour' });

    this.el.appendChild(this._minuteHand);
    this.el.appendChild(this._hourHand);
    this.el.appendChild(this._minuteHit);
    this.el.appendChild(this._hourHit);
    this.el.appendChild(svgEl('circle', { cx: CX, cy: CY, r: 5, class: 'center-dot' }));

    this._renderMarkers();
  }

  _renderMarkers() {
    this._markers.innerHTML = '';
    for (let i = 0; i < 12; i++) {
      const angle = i * 30;
      const rad = angle * Math.PI / 180;

      if (this._showNumbers) {
        const o = R - 6, t = R - 20;
        this._markers.appendChild(svgEl('line', {
          x1: CX + o * Math.sin(rad), y1: CY - o * Math.cos(rad),
          x2: CX + t * Math.sin(rad), y2: CY - t * Math.cos(rad),
          class: 'hour-tick',
        }));
        const nr = R - 32;
        const num = svgEl('text', {
          x: CX + nr * Math.sin(rad),
          y: CY - nr * Math.cos(rad),
          class: 'hour-num',
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
        });
        num.textContent = String(i === 0 ? 12 : i);
        this._markers.appendChild(num);
      } else {
        const dr = R - 10;
        this._markers.appendChild(svgEl('circle', {
          cx: CX + dr * Math.sin(rad),
          cy: CY - dr * Math.cos(rad),
          r: i === 0 ? 5 : 3,
          class: 'hour-dot',
        }));
      }
    }
  }

  _renderHands() {
    const hAngle = hoursToAngle(this._hours, this._minutes);
    const mAngle = minutesToAngle(this._minutes);
    setLine(this._hourHand, hAngle, 52);
    setLine(this._minuteHand, mAngle, 72);
    setLine(this._hourHit, hAngle, 52);
    setLine(this._minuteHit, mAngle, 72);
  }

  update({ hours, minutes }) {
    this._hours = hours;
    this._minutes = minutes;
    this._renderHands();
  }

  get isDragging() { return this._dragging !== null; }

  get showNumbers() { return this._showNumbers; }

  set showNumbers(v) {
    this._showNumbers = v;
    this._renderMarkers();
  }

  onChange(fn) { this._handler = fn; }

  _bindDrag() {
    const onStart = (clientX, clientY, target) => {
      const hand = target.closest?.('[data-hand]') ?? (target.hasAttribute?.('data-hand') ? target : null);
      if (!hand) return;
      this._dragging = hand.getAttribute('data-hand');
    };

    const onMove = (clientX, clientY) => {
      if (!this._dragging) return;
      const pt = svgPoint(this.el, clientX, clientY);
      const angle = pointAngle(CX, CY, pt.x, pt.y);
      if (this._dragging === 'minute') {
        const prev = this._minutes;
        this._minutes = angleToMinutes(angle);
        if (prev > 45 && this._minutes < 15) {
          this._hours = (this._hours + 1) % 24;
        } else if (prev < 15 && this._minutes > 45) {
          this._hours = (this._hours + 23) % 24;
        }
      } else {
        const h12 = angleToHours12(angle);
        this._hours = h12 + (this._hours >= 12 ? 12 : 0);
      }
      this._renderHands();
      this._handler?.({ hours: this._hours, minutes: this._minutes });
    };

    const onEnd = () => { this._dragging = null; };

    this.el.addEventListener('mousedown',  e => onStart(e.clientX, e.clientY, e.target));
    this.el.addEventListener('touchstart', e => { onStart(e.touches[0].clientX, e.touches[0].clientY, e.target); e.preventDefault(); }, { passive: false });
    document.addEventListener('mousemove',  e => onMove(e.clientX, e.clientY));
    document.addEventListener('touchmove',  e => onMove(e.touches[0].clientX, e.touches[0].clientY));
    document.addEventListener('mouseup',   onEnd);
    document.addEventListener('touchend',  onEnd);
  }
}
