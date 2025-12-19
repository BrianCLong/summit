import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import App from './App'
import config from './config'
import { DesignSystemProvider } from './theme/DesignSystemProvider'
import './index.css'

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
        <DesignSystemProvider>
          <App />
        </DesignSystemProvider>
      </Provider>
    </React.StrictMode>
  )
})
