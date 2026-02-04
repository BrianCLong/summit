import './tracing'; // Initialize OpenTelemetry before anything else
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { store } from './store';
import { reportWebVitals } from './telemetry';

// Expose store for tests
(window as any).store = store;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

reportWebVitals();
