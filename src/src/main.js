import '@picocss/pico/css/pico.min.css'
import './components/app-shell.js'
import './components/app-card.js'
import './components/app-button.js'

document.addEventListener('app-click', (e) => {
  console.log('app-click:', e.detail)
})
