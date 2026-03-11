import { useMemo } from 'react';
import type { InvestigationMemoryRecord } from './InvestigationMemory';

interface MemorySearchProps {
  memory: InvestigationMemoryRecord;
  query: string;
}

export function MemorySearch({ memory, query }: MemorySearchProps) {
  const normalizedQuery = query.trim().toLowerCase();
  const matchingNotes = useMemo(
    () =>
      memory.analystNotes.filter((note) =>
        note.text.toLowerCase().includes(normalizedQuery),
      ),
    [memory.analystNotes, normalizedQuery],
  );

  return (
    <section aria-label="memory-search">
      <h3>Memory Search</h3>
      <p>Matches: {normalizedQuery ? matchingNotes.length : 0}</p>
    </section>
  );
}
