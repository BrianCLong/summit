import React from 'react';
import { navigationMap } from '../navigation-map';

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

interface CommandItem {
  id: string;
  label: string;
  category: string;
  action: () => void;
  shortcut?: string;
  icon?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, onNavigate }) => {
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Build command list from navigation + built-in commands
  const commands = React.useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // Navigation commands
    for (const section of navigationMap) {
      items.push({
        id: `nav-${section.id}`,
        label: section.label,
        category: 'Navigation',
        action: () => { onNavigate(section.path); onClose(); },
      });
      for (const child of section.children ?? []) {
        items.push({
          id: `nav-${child.id}`,
          label: `${section.label} > ${child.label}`,
          category: 'Navigation',
          action: () => { onNavigate(child.path); onClose(); },
        });
      }
    }

    // Built-in commands
    items.push(
      { id: 'cmd-search-entity', label: 'Search entities', category: 'Actions', action: () => { onNavigate('/intelgraph/search'); onClose(); }, shortcut: 'Ctrl+E' },
      { id: 'cmd-new-investigation', label: 'New investigation', category: 'Actions', action: () => { onNavigate('/investigations/active'); onClose(); } },
      { id: 'cmd-run-simulation', label: 'Run simulation', category: 'Actions', action: () => { onNavigate('/simulations/runner'); onClose(); } },
      { id: 'cmd-graph-query', label: 'Query graph (NL2Cypher)', category: 'Actions', action: () => { onNavigate('/intelgraph/graphrag'); onClose(); } },
      { id: 'cmd-open-repo', label: 'Open repository', category: 'Actions', action: () => { onNavigate('/repositories/dashboard'); onClose(); } },
    );

    return items;
  }, [onNavigate, onClose]);

  const filteredCommands = React.useMemo(() => {
    if (!query) return commands.slice(0, 20);
    const q = query.toLowerCase();
    return commands.filter((cmd) => cmd.label.toLowerCase().includes(q) || cmd.category.toLowerCase().includes(q));
  }, [commands, query]);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault();
      filteredCommands[selectedIndex].action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  // Group commands by category
  const grouped: Record<string, CommandItem[]> = {};
  for (const cmd of filteredCommands) {
    (grouped[cmd.category] ??= []).push(cmd);
  }

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-commandPalette flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-bg-overlay backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-bg-elevated border border-border-default rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center px-4 border-b border-border-default">
          <svg className="w-5 h-5 text-fg-tertiary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 h-12 px-3 bg-transparent text-fg-primary placeholder-fg-tertiary text-sm focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-2xs text-fg-muted bg-bg-tertiary rounded border border-border-default font-mono">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-fg-tertiary text-sm">No results found</div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-2xs font-semibold text-fg-muted uppercase tracking-wider">{category}</div>
                {items.map((cmd) => {
                  flatIndex++;
                  const idx = flatIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={[
                        'w-full flex items-center justify-between px-4 py-2 text-sm transition-colors',
                        selectedIndex === idx ? 'bg-brand-primary/10 text-fg-primary' : 'text-fg-secondary hover:text-fg-primary',
                      ].join(' ')}
                    >
                      <span>{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="px-1.5 py-0.5 text-2xs text-fg-muted bg-bg-tertiary rounded border border-border-default font-mono">{cmd.shortcut}</kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border-default flex items-center gap-4 text-2xs text-fg-muted">
          <span><kbd className="font-mono">↑↓</kbd> Navigate</span>
          <span><kbd className="font-mono">↵</kbd> Select</span>
          <span><kbd className="font-mono">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
};
