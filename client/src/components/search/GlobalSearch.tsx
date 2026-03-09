import * as React from 'react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { SearchDomain, SearchFilters, SearchResult } from '@/types/intelligence-os';
import { SearchResults } from './SearchResults';

// ---------------------------------------------------------------------------
// GlobalSearch — unified intelligence search interface
// ---------------------------------------------------------------------------

export interface GlobalSearchProps extends React.HTMLAttributes<HTMLDivElement> {
  results?: SearchResult[];
  isSearching?: boolean;
  onSearch?: (query: string, filters: SearchFilters) => void;
  onResultSelect?: (result: SearchResult) => void;
}

const DOMAINS: { value: SearchDomain; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'entities', label: 'Entities' },
  { value: 'events', label: 'Events' },
  { value: 'investigations', label: 'Investigations' },
  { value: 'narratives', label: 'Narratives' },
  { value: 'insights', label: 'Insights' },
  { value: 'reports', label: 'Reports' },
];

const GlobalSearch = React.forwardRef<HTMLDivElement, GlobalSearchProps>(
  ({ className, results = [], isSearching = false, onSearch, onResultSelect, ...props }, ref) => {
    const [query, setQuery] = React.useState('');
    const [domain, setDomain] = React.useState<SearchDomain>('all');

    const handleSubmit = React.useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        onSearch?.(query.trim(), { domain: domain === 'all' ? undefined : domain });
      },
      [query, domain, onSearch],
    );

    return (
      <div ref={ref} className={cn('flex flex-col gap-4', className)} {...props}>
        {/* Search bar */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search intelligence..."
            className="flex-1"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Search
          </button>
        </form>

        {/* Domain filter pills */}
        <div className="flex flex-wrap gap-1">
          {DOMAINS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDomain(d.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                d.value === domain
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Status */}
        {isSearching && (
          <div className="text-sm text-muted-foreground">Searching...</div>
        )}

        {/* Results */}
        <SearchResults results={results} onSelect={onResultSelect} />
      </div>
    );
  },
);
GlobalSearch.displayName = 'GlobalSearch';

export { GlobalSearch };
