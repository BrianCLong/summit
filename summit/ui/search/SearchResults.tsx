export interface SearchResult {
  id: string;
  kind: 'entity' | 'event' | 'report' | 'memory-entry';
  title: string;
  excerpt: string;
}

interface SearchResultsProps {
  results: SearchResult[];
}

export function SearchResults({ results }: SearchResultsProps) {
  return (
    <section aria-label="search-results">
      <h3>Search Results</h3>
      <p>Total: {results.length}</p>
    </section>
  );
}
