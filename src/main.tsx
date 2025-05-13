import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LogProvider } from './utils/logging/LogContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LogProvider>
      <App />
    </LogProvider>
  </StrictMode>,
)
