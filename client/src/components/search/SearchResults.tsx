import * as React from 'react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { SearchResult } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// SearchResults — display list of search results
// ---------------------------------------------------------------------------

export interface SearchResultsProps extends React.HTMLAttributes<HTMLDivElement> {
  results: SearchResult[];
  onSelect?: (result: SearchResult) => void;
}

const DOMAIN_COLORS: Record<string, string> = {
  entities: 'bg-blue-500/10 text-blue-400',
  events: 'bg-purple-500/10 text-purple-400',
  investigations: 'bg-green-500/10 text-green-400',
  narratives: 'bg-orange-500/10 text-orange-400',
  insights: 'bg-cyan-500/10 text-cyan-400',
  reports: 'bg-zinc-500/10 text-zinc-400',
};

const SearchResults = React.forwardRef<HTMLDivElement, SearchResultsProps>(
  ({ className, results, onSelect, ...props }, ref) => {
    if (results.length === 0) {
      return (
        <div ref={ref} className={cn('py-6 text-center text-sm text-muted-foreground', className)} {...props}>
          No results. Try a different query or broaden your filters.
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('flex flex-col gap-1', className)} {...props}>
        <div className="text-xs text-muted-foreground">{results.length} results</div>
        {results.map((r) => (
          <button
            key={r.id}
            onClick={() => onSelect?.(r)}
            className="flex flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted"
          >
            <div className="flex items-center gap-2">
              <Badge className={cn('text-[10px]', DOMAIN_COLORS[r.domain] ?? DOMAIN_COLORS.reports)}>
                {r.domain}
              </Badge>
              <span className="text-sm font-medium">{r.title}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {Math.round(r.score * 100)}%
              </span>
            </div>
            <span className="text-xs text-muted-foreground line-clamp-1">{r.snippet}</span>
          </button>
        ))}
      </div>
    );
  },
);
SearchResults.displayName = 'SearchResults';

export { SearchResults };
