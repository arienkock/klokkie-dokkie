import { createStore } from './store.js';
import { DigitalClock } from './components/DigitalClock.js';
import { AnalogClock } from './components/AnalogClock.js';

const store = createStore({ hours: 10, minutes: 10 });

const digital = new DigitalClock();
const analog  = new AnalogClock({ showNumbers: true });

analog.onChange(time => store.setTime(time));

store.subscribe(time => {
  digital.update(time);
  if (!analog.isDragging) analog.update(time);
  document.getElementById('hours').value   = time.hours;
  document.getElementById('minutes').value = time.minutes;
});

document.getElementById('analog-mount').appendChild(analog.el);
document.getElementById('digital-mount').appendChild(digital.el);

document.getElementById('hours').addEventListener('input', e => {
  const v = parseInt(e.target.value, 10);
  if (!isNaN(v)) store.setTime({ hours: v });
});

document.getElementById('minutes').addEventListener('input', e => {
  const v = parseInt(e.target.value, 10);
  if (!isNaN(v)) store.setTime({ minutes: v });
});

document.getElementById('show-numbers').addEventListener('change', e => {
  analog.showNumbers = e.target.checked;
});

store.setTime(store.getTime());
