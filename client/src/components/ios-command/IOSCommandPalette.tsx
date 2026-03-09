import * as React from 'react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { IOSCommand } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// IOSCommandPalette — universal command interface (Cmd+K style)
// ---------------------------------------------------------------------------

export interface IOSCommandPaletteProps extends React.HTMLAttributes<HTMLDivElement> {
  commands: IOSCommand[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CATEGORY_COLORS: Record<IOSCommand['category'], string> = {
  investigation: 'text-green-400',
  graph: 'text-blue-400',
  simulation: 'text-purple-400',
  agent: 'text-cyan-400',
  insight: 'text-orange-400',
  navigation: 'text-zinc-400',
};

const IOSCommandPalette = React.forwardRef<HTMLDivElement, IOSCommandPaletteProps>(
  ({ className, commands, open = false, onOpenChange, ...props }, ref) => {
    const [query, setQuery] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Keyboard shortcut: Ctrl/Cmd + K
    React.useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          onOpenChange?.(!open);
        }
        if (e.key === 'Escape' && open) {
          onOpenChange?.(false);
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }, [open, onOpenChange]);

    // Auto-focus input when opened
    React.useEffect(() => {
      if (open) {
        setQuery('');
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }, [open]);

    const filtered = React.useMemo(() => {
      const q = query.toLowerCase().trim();
      if (!q) return commands;
      return commands.filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.category.includes(q),
      );
    }, [query, commands]);

    const grouped = React.useMemo(() => {
      const groups = new Map<string, IOSCommand[]>();
      for (const cmd of filtered) {
        const list = groups.get(cmd.category) ?? [];
        list.push(cmd);
        groups.set(cmd.category, list);
      }
      return groups;
    }, [filtered]);

    if (!open) return null;

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => onOpenChange?.(false)}
        />

        {/* Palette */}
        <div
          ref={ref}
          className={cn(
            'fixed left-1/2 top-1/4 z-50 w-full max-w-lg -translate-x-1/2 rounded-lg border bg-background shadow-lg',
            className,
          )}
          {...props}
        >
          <div className="border-b p-3">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command..."
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No commands found.</div>
            ) : (
              [...grouped.entries()].map(([category, cmds]) => (
                <div key={category} className="mb-2">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {category}
                  </div>
                  {cmds.map((cmd) => (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.execute();
                        onOpenChange?.(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted"
                    >
                      <span className={cn('text-sm font-medium', CATEGORY_COLORS[cmd.category])}>
                        {cmd.label}
                      </span>
                      <span className="flex-1 text-xs text-muted-foreground">{cmd.description}</span>
                      {cmd.shortcut && (
                        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </>
    );
  },
);
IOSCommandPalette.displayName = 'IOSCommandPalette';

export { IOSCommandPalette };
