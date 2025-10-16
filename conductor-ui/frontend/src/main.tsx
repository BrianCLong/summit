import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import MaestroApp from './maestro/App';
import './index.css'; // Assuming default Vite CSS

const root = ReactDOM.createRoot(document.getElementById('root')!);

// Choose UI surface without overwriting existing app:
// Default to Maestro UI unless Symphony is specifically requested
const url = new URL(window.location.href);
const wantSymphony =
  url.searchParams.get('ui') === 'symphony' ||
  url.pathname.startsWith('/symphony');

root.render(
  <React.StrictMode>
    {wantSymphony ? <App /> : <MaestroApp />}
  </React.StrictMode>,
);
