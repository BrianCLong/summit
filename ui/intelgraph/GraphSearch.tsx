import React from 'react';
import { SearchBar } from '../design-system/SearchBar';
import { StatusBadge } from '../design-system/StatusBadge';
import { Button } from '../design-system/Button';

export interface SearchResult {
  id: string;
  label: string;
  type: string;
  score: number;
  snippet?: string;
  properties?: Record<string, string>;
}

export interface GraphSearchProps {
  results?: SearchResult[];
  onSearch?: (query: string, filters?: Record<string, string>) => void;
  onResultSelect?: (resultId: string) => void;
}

export const GraphSearch: React.FC<GraphSearchProps> = ({ results = [], onSearch, onResultSelect }) => {
  const [query, setQuery] = React.useState('');
  const [entityType, setEntityType] = React.useState('all');

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold text-fg-primary">Entity Search</h1>

      <div className="flex items-center gap-3">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={(q) => onSearch?.(q, entityType !== 'all' ? { type: entityType } : undefined)}
          placeholder="Search entities by name, property, or relationship..."
          size="md"
          className="flex-1"
          shortcut="Ctrl+E"
        />
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="h-10 px-3 bg-bg-secondary border border-border-default rounded-lg text-sm text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
        >
          <option value="all">All Types</option>
          <option value="person">Person</option>
          <option value="organization">Organization</option>
          <option value="location">Location</option>
          <option value="event">Event</option>
          <option value="indicator">Indicator</option>
        </select>
      </div>

      {/* Search results */}
      <div className="space-y-2">
        {results.length === 0 ? (
          <div className="py-12 text-center text-fg-tertiary text-sm">
            Enter a search query to find entities in the intelligence graph
          </div>
        ) : (
          results.map((result) => (
            <button
              key={result.id}
              onClick={() => onResultSelect?.(result.id)}
              className="w-full text-left bg-bg-surface border border-border-default rounded-lg p-4 hover:border-brand-primary/40 hover:shadow-glow transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-fg-primary">{result.label}</span>
                  <StatusBadge status="info" label={result.type} dot={false} />
                </div>
                <span className="text-xs text-fg-tertiary">Score: {result.score.toFixed(2)}</span>
              </div>
              {result.snippet && <p className="text-xs text-fg-secondary mt-1">{result.snippet}</p>}
              {result.properties && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Object.entries(result.properties).slice(0, 4).map(([k, v]) => (
                    <span key={k} className="text-2xs px-1.5 py-0.5 bg-bg-tertiary text-fg-secondary rounded">{k}: {v}</span>
                  ))}
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};
