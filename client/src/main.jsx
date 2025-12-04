import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.router.jsx';
import './styles/globals.css';
import { initWebVitals } from './utils/webVitals.js';
import ErrorBoundary, {
  ErrorFallback as ErrorBoundaryFallback,
} from './components/common/ErrorBoundary';

console.log('🚀 Starting Full IntelGraph Router App...');

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('🚨 GLOBAL ERROR:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 UNHANDLED PROMISE REJECTION:', event.reason);
});

const root = document.getElementById('root');

if (!root) {
  console.error('❌ CRITICAL: Root element not found!');
} else {
  try {
    console.log('📍 Creating React root with full stack...');

    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <ErrorBoundary
          fallback={(error, _errorInfo, resetErrorBoundary) => (
            <ErrorBoundaryFallback
              error={error}
              resetErrorBoundary={resetErrorBoundary}
              title="IntelGraph experienced an unexpected error"
            />
          )}
          onReset={() => console.info('Error boundary reset triggered')}
        >
          <App />
        </ErrorBoundary>
      </React.StrictMode>,
    );

    console.log('✅ Full IntelGraph app rendered successfully');
  } catch (error) {
    console.error('❌ CRITICAL ERROR during render:', error);

    root.innerHTML = `
      <div style="padding: 20px; background: #ffcdd2; border: 2px solid #f44336; border-radius: 8px; margin: 20px; font-family: Arial;">
        <h1 style="color: #d32f2f;">❌ IntelGraph App Failed</h1>
        <p><strong>Error:</strong> ${error.message}</p>
        <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error.stack}</pre>
      </div>
    `;
  }
}

initWebVitals();
