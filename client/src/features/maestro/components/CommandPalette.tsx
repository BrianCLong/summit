import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  onSelect: () => void;
}

export function CommandPalette({
  open,
  onClose,
  basePath,
}: {
  open: boolean;
  onClose: () => void;
  basePath: string;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState('');

  const commands = React.useMemo<Command[]>(
    () => [
      {
        id: 'dashboard',
        label: 'Go to Dashboard',
        shortcut: 'g d',
        onSelect: () => navigate(`${basePath}dashboard`),
      },
      {
        id: 'pipelines',
        label: 'Open Pipelines',
        shortcut: 'g p',
        onSelect: () => navigate(`${basePath}pipelines`),
      },
      {
        id: 'runs',
        label: 'Open Latest Run',
        shortcut: 'g r',
        onSelect: () => navigate(`${basePath}runs/run-1`),
      },
      {
        id: 'releases',
        label: 'View Releases',
        shortcut: 'g l',
        onSelect: () => navigate(`${basePath}releases`),
      },
      {
        id: 'observability',
        label: 'Open Observability',
        shortcut: 'g o',
        onSelect: () => navigate(`${basePath}observability`),
      },
      {
        id: 'admin',
        label: 'View Audit Log',
        shortcut: 'g a',
        onSelect: () => navigate(`${basePath}admin`),
      },
    ],
    [basePath, navigate],
  );

  const filtered = React.useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return commands;
    return commands.filter((command) =>
      command.label.toLowerCase().includes(trimmed),
    );
  }, [commands, query]);

  React.useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    if (open) {
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }
    return undefined;
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/40 pt-24">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl">
        <div className="border-b border-slate-700/70 px-4 py-3">
          <input
            autoFocus
            className="w-full rounded-lg bg-slate-800/60 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-emerald-400 focus-visible:outline-offset-2"
            placeholder="Search commands or actions…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {filtered.map((command) => (
            <li key={command.id}>
              <button
                type="button"
                onClick={() => {
                  command.onSelect();
                  onClose();
                }}
                className="flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left text-sm text-slate-100 transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-emerald-400 focus-visible:outline-offset-2"
              >
                <span>{command.label}</span>
                {command.shortcut ? (
                  <span className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-300">
                    {command.shortcut}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-slate-400">
              No commands match “{query}”.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
