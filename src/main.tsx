import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Load analytics
const script = document.createElement('script')
script.src = 'https://analytics.artificery.io/api/script.js'
script.dataset.siteId = 'fb2ffc6918bd'
script.defer = true
document.head.appendChild(script)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
