import React, { useEffect, useMemo, useRef, useState } from 'react';

type Item = { id: string; label: string; action: () => void };

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'p'
      ) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const items: Item[] = useMemo(
    () => [
      {
        id: 'open-copilot',
        label: 'Open Copilot',
        action: () => {
          window.dispatchEvent(new CustomEvent('open-copilot'));
          setOpen(false);
        },
      },
      {
        id: 'run-copilot-nl2',
        label: 'Run Copilot (nl2cypher)',
        action: () => {
          window.dispatchEvent(
            new CustomEvent('copilot:run', { detail: { mode: 'nl2cypher' } }),
          );
          setOpen(false);
        },
      },
      {
        id: 'run-copilot-ask',
        label: 'Run Copilot (ask)',
        action: () => {
          window.dispatchEvent(
            new CustomEvent('copilot:run', { detail: { mode: 'ask' } }),
          );
          setOpen(false);
        },
      },
    ],
    [],
  );

  const filtered = items.filter((i) =>
    i.label.toLowerCase().includes(q.toLowerCase()),
  );

  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.3)',
        zIndex: 9999,
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          maxWidth: 600,
          margin: '10% auto',
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 12, borderBottom: '1px solid #eee' }}>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a command (Open Copilot)…"
            style={{
              width: '100%',
              fontSize: 16,
              padding: 8,
              outline: 'none',
              border: 'none',
            }}
          />
        </div>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            maxHeight: 300,
            overflowY: 'auto',
          }}
        >
          {filtered.map((it) => (
            <li
              key={it.id}
              style={{
                padding: '10px 12px',
                borderTop: '1px solid #f4f4f4',
                cursor: 'pointer',
              }}
              onClick={it.action}
            >
              {it.label}
            </li>
          ))}
          {!filtered.length && (
            <li style={{ padding: '10px 12px', color: '#888' }}>No matches</li>
          )}
        </ul>
      </div>
    </div>
  );
}
