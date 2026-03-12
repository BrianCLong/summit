import * as React from 'react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { Entity } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// EntitySearch — entity-specific search with type filtering
// ---------------------------------------------------------------------------

export interface EntitySearchProps extends React.HTMLAttributes<HTMLDivElement> {
  entities: Entity[];
  entityTypes?: string[];
  onSelect?: (entity: Entity) => void;
}

const EntitySearch = React.forwardRef<HTMLDivElement, EntitySearchProps>(
  ({ className, entities, entityTypes = [], onSelect, ...props }, ref) => {
    const [query, setQuery] = React.useState('');
    const [selectedType, setSelectedType] = React.useState<string | null>(null);

    const types = React.useMemo(() => {
      if (entityTypes.length > 0) return entityTypes;
      return [...new Set(entities.map((e) => e.type))];
    }, [entities, entityTypes]);

    const filtered = React.useMemo(() => {
      const q = query.toLowerCase().trim();
      return entities.filter((e) => {
        if (selectedType && e.type !== selectedType) return false;
        if (q && !e.label.toLowerCase().includes(q) && !e.type.toLowerCase().includes(q)) return false;
        return true;
      });
    }, [entities, query, selectedType]);

    return (
      <div ref={ref} className={cn('flex flex-col gap-3', className)} {...props}>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entities..."
        />

        {types.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedType(null)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                !selectedType
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              All
            </button>
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t === selectedType ? null : t)}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                  t === selectedType
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1">
          {filtered.slice(0, 50).map((e) => (
            <button
              key={e.id}
              onClick={() => onSelect?.(e)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted"
            >
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {e.type}
              </span>
              <span className="text-sm font-medium">{e.label}</span>
            </button>
          ))}
          {filtered.length > 50 && (
            <span className="py-2 text-center text-xs text-muted-foreground">
              +{filtered.length - 50} more results
            </span>
          )}
        </div>
      </div>
    );
  },
);
EntitySearch.displayName = 'EntitySearch';

export { EntitySearch };
