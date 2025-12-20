import React from 'react';
import { AdaptersPage } from './features/adapters/AdaptersPage';

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Switchboard</p>
          <h1>Adapters</h1>
          <p className="lede">
            Manage installed adapters, track verification results, and keep receipts handy for
            downstream audit.
          </p>
        </div>
      </header>
      <main>
        <AdaptersPage />
      </main>
    </div>
  );
}

export default App;
