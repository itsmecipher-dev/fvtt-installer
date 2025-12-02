import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Load Rybbit analytics if site ID is configured
const rybbitSiteId = import.meta.env.VITE_RYBBIT_SITE_ID
if (rybbitSiteId) {
  const script = document.createElement('script')
  script.src = 'https://app.rybbit.io/api/script.js'
  script.dataset.siteId = rybbitSiteId
  script.async = true
  script.defer = true
  document.head.appendChild(script)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
