import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Start MSW for development or when explicitly enabled
async function enableMocking() {
  const shouldMock = import.meta.env.DEV || import.meta.env.VITE_ENABLE_MSW === 'true'

  if (!shouldMock) {
    return
  }

  const { worker } = await import('./mock/browser')

  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js'
    }
  })
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
