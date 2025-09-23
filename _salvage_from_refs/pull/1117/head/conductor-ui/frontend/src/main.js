import { jsx as _jsx } from 'react/jsx-runtime';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import MaestroApp from './maestro/App';
import './index.css'; // Assuming default Vite CSS
const root = ReactDOM.createRoot(document.getElementById('root'));
// Choose UI surface without overwriting existing app:
// If URL path starts with /maestro or query contains ui=maestro, render Maestro UI.
const url = new URL(window.location.href);
const wantMaestro = url.pathname.startsWith('/maestro') || url.searchParams.get('ui') === 'maestro';
root.render(
  _jsx(React.StrictMode, { children: wantMaestro ? _jsx(MaestroApp, {}) : _jsx(App, {}) }),
);
