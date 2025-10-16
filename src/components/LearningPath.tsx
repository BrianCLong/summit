import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
export default function LearningPath({
  id,
  modules,
}: {
  id: string;
  modules: string[];
}) {
  const key = `learn:${id}`;
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => {
    setDone(JSON.parse(localStorage.getItem(key) || '[]'));
  }, [id]);
  const toggle = (m: string) => {
    const next = done.includes(m) ? done.filter((x) => x !== m) : [...done, m];
    setDone(next);
    localStorage.setItem(key, JSON.stringify(next));
  };
  const pct = Math.round((done.length / modules.length) * 100);
  return (
    <div className="card padding--md">
      <p>Progress: {pct}%</p>
      <ul>
        {modules.map((m) => (
          <li key={m} className="margin-vert--sm">
            <input
              type="checkbox"
              checked={done.includes(m)}
              onChange={() => toggle(m)}
              aria-label={`Mark ${m} complete`}
            />{' '}
            <Link to={`/${m.replace(/^docs\//, '').replace(/\.mdx?$/, '')}`}>
              {m
                .split('/')
                .pop()
                ?.replace(/\.mdx?$/, '')}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
