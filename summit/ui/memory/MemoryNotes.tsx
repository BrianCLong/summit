import type { InvestigationMemoryRecord } from './InvestigationMemory';

interface MemoryNotesProps {
  notes: InvestigationMemoryRecord['analystNotes'];
  hypothesisChanges: InvestigationMemoryRecord['hypotheses'];
}

export function MemoryNotes({ notes, hypothesisChanges }: MemoryNotesProps) {
  return (
    <section aria-label="memory-notes">
      <h3>Analytical Decisions</h3>
      <p>Decision notes: {notes.length}</p>
      <p>Hypothesis evolution entries: {hypothesisChanges.length}</p>
    </section>
  );
}
