import * as React from 'react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { InvestigationMemory } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// MemorySearch — full-text search across investigation memory
// ---------------------------------------------------------------------------

export interface MemorySearchProps extends React.HTMLAttributes<HTMLDivElement> {
  investigation: InvestigationMemory;
  onEntitySelect?: (entityId: string) => void;
}

interface MemoryHit {
  id: string;
  category: string;
  label: string;
  snippet: string;
}

const MemorySearch = React.forwardRef<HTMLDivElement, MemorySearchProps>(
  ({ className, investigation, onEntitySelect, ...props }, ref) => {
    const [query, setQuery] = React.useState('');

    const hits = React.useMemo<MemoryHit[]>(() => {
      const q = query.toLowerCase().trim();
      if (!q) return [];

      const results: MemoryHit[] = [];

      for (const e of investigation.entities) {
        if (e.label.toLowerCase().includes(q) || e.type.toLowerCase().includes(q)) {
          results.push({ id: e.id, category: 'Entity', label: e.label, snippet: e.type });
        }
      }
      for (const ev of investigation.events) {
        if (ev.title.toLowerCase().includes(q) || ev.description.toLowerCase().includes(q)) {
          results.push({ id: ev.id, category: 'Event', label: ev.title, snippet: ev.description.slice(0, 100) });
        }
      }
      for (const h of investigation.hypotheses) {
        if (h.text.toLowerCase().includes(q)) {
          results.push({ id: h.id, category: 'Hypothesis', label: h.text.slice(0, 60), snippet: h.status });
        }
      }
      for (const n of investigation.analystNotes) {
        if (n.content.toLowerCase().includes(q)) {
          results.push({
            id: n.id,
            category: 'Note',
            label: n.content.slice(0, 60),
            snippet: `by ${n.authorName}`,
          });
        }
      }

      return results;
    }, [query, investigation]);

    return (
      <div ref={ref} className={cn('flex flex-col gap-3', className)} {...props}>
        <Input
          placeholder="Search investigation memory..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full"
        />

        {query && (
          <div className="text-xs text-muted-foreground">{hits.length} result{hits.length !== 1 ? 's' : ''}</div>
        )}

        <div className="flex flex-col gap-1">
          {hits.map((hit) => (
            <button
              key={hit.id}
              onClick={() => onEntitySelect?.(hit.id)}
              className="flex flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {hit.category}
                </span>
                <span className="text-sm font-medium">{hit.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{hit.snippet}</span>
            </button>
          ))}
        </div>
      </div>
    );
  },
);
MemorySearch.displayName = 'MemorySearch';

export { MemorySearch };
