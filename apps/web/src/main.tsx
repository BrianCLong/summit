import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import App from './App'
import config from './config'
import './index.css'
import reportWebVitals from './reportWebVitals';

// Start MSW for development
async function enableMocking() {
  if (config.env !== 'development') {
    return
  }

  const { worker } = await import('./mock/browser')

  return worker.start({
    onUnhandledRequest: 'bypass',
  })
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>
  )

  // Initialize Web Vitals reporting
  reportWebVitals();
})
