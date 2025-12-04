'use client';

import React from 'react';
import '../styles/dashboard.css';
import './globals.css';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorProps) {
  React.useEffect(() => {
    // Log for observability pipelines while keeping UI minimal
    console.error('Retention dashboard error boundary', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="main">
          <section className="empty-state">
            <h1>Something went wrong</h1>
            <p>
              We hit an unexpected issue while loading the retention dashboard. You can try
              recovering below or refresh your browser.
            </p>
            <div className="error-actions">
              <button className="cta" type="button" onClick={() => reset()}>
                Retry last action
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => window.location.assign(window.location.pathname)}
              >
                Reload dashboard
              </button>
            </div>
            {error?.digest && (
              <p className="error-digest">Reference code: {error.digest}</p>
            )}
          </section>
        </main>
      </body>
    </html>
  );
}
