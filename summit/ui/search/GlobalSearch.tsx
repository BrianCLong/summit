interface GlobalSearchProps {
  query: string;
  sources: Array<'intelgraph' | 'investigation-memory' | 'datasets' | 'reports'>;
}

export function GlobalSearch({ query, sources }: GlobalSearchProps) {
  return (
    <section aria-label="global-search">
      <h2>Intelligence Search</h2>
      <p>
        Searching "{query}" across {sources.length} sources.
      </p>
    </section>
  );
}
