import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { store } from './store';

(globalThis as any).__VITE_IMPORT_META_ENV__ = (globalThis as any).__VITE_IMPORT_META_ENV__ ??
  (typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined);

// Expose store for tests
(window as any).store = store;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
