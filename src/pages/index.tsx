import React from 'react';
import Link from '@docusaurus/Link';

const roles = [
  { href: '/get-started/for-users', label: 'User' },
  { href: '/get-started/for-admins', label: 'Admin' },
  { href: '/get-started/for-operators', label: 'Operator' },
];

const tasks = [
  { href: '/tutorials/first-ingest', label: 'Ingest your first dataset' },
  { href: '/how-to/zip-export', label: 'ZIP Export & Certification' },
  { href: '/how-to/upgrade-to-v24', label: 'Upgrade to v24' },
  { href: '/reference', label: 'API & CLI Reference' },
];

export default function Home(){
  return (
    <main className="container margin-vert--lg">
      <section className="hero">
        <h1>IntelGraph Documentation</h1>
        <p className="hero__subtitle">Find answers fast—by role, task, or search.</p>
        <div className="flex gap-2 margin-top--sm">
          {roles.map(r => <Link key={r.href} className="button button--primary" to={r.href}>{r.label}</Link>)}
        </div>
        <div className="margin-top--md">
          <div className="docsearch-input" aria-label="Search docs" />
        }
      </section>
      <section className="margin-top--xl">
        <h2>Top tasks</h2>
        <ul>
          {tasks.map(t => <li key={t.href}><Link to={t.href}>{t.label}</Link></li>)}
        </ul>
      </section>
      <section className="margin-top--xl">
        <h2>What’s new</h2>
        <ul>
          <li><Link to="/releases/v24">Release Notes — v24</Link></li>
          <li><Link to="/reference/deprecations">Deprecations & Removals</Link></li>
        </ul>
      </section>
    </main>
  );
}