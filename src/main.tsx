import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

const isNativeApp = 'Capacitor' in window

if ('serviceWorker' in navigator && import.meta.env.PROD && !isNativeApp) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 离线能力属于增强项，注册失败不影响正常使用
    })
  })
}
