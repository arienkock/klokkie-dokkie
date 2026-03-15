import { createStore } from './store.js';
import { DigitalClock } from './components/DigitalClock.js';
import { AnalogClock } from './components/AnalogClock.js';

const store = createStore({ hours: 10, minutes: 10 });

const digital = new DigitalClock();
const analog  = new AnalogClock({ showNumbers: true });

analog.onChange(time => store.setTime(time));

const wrap = (value, max) => ((value % max) + max) % max;

store.subscribe(time => {
  digital.update(time);
  if (!analog.isDragging) analog.update(time);
  document.getElementById('hours').value   = time.hours;
  document.getElementById('minutes').value = String(time.minutes).padStart(2, '0');
});

document.getElementById('analog-mount').appendChild(analog.el);
document.getElementById('digital-mount').appendChild(digital.el);

document.getElementById('hours').addEventListener('change', e => {
  const v = parseInt(e.target.value, 10);
  if (!isNaN(v)) store.setTime({ hours: wrap(v, 24) });
});

document.getElementById('minutes').addEventListener('change', e => {
  const v = parseInt(e.target.value, 10);
  if (isNaN(v)) return;
  const current = store.getTime();
  const minutes = ((v % 60) + 60) % 60;
  const hours   = wrap(current.hours + Math.floor(v / 60), 24);
  store.setTime({ hours, minutes });
});

document.getElementById('show-numbers').addEventListener('change', e => {
  analog.showNumbers = e.target.checked;
});

store.setTime(store.getTime());
