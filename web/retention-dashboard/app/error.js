"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GlobalError;
const react_1 = __importDefault(require("react"));
require("../styles/dashboard.css");
require("./globals.css");
function GlobalError({ error, reset }) {
    react_1.default.useEffect(() => {
        // Log for observability pipelines while keeping UI minimal
        console.error('Retention dashboard error boundary', error);
    }, [error]);
    return (<html lang="en">
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
              <button className="secondary" type="button" onClick={() => window.location.assign(window.location.pathname)}>
                Reload dashboard
              </button>
            </div>
            {error?.digest && (<p className="error-digest">Reference code: {error.digest}</p>)}
          </section>
        </main>
      </body>
    </html>);
}
