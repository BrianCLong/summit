import React from 'react';
import Link from '@docusaurus/Link';
export default function NotFound() {
  return (
    <main className="container margin-vert--lg">
      <h1>Page not found</h1>
      <p>Try search or jump to a top area:</p>
      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/reference">Reference</Link>
        </li>
        <li>
          <Link to="/how-to">How-tos</Link>
        </li>
      </ul>
    </main>
  );
}
