import * as React from 'react';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import type { AnalystNote } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// MemoryNotes — analyst notes associated with an investigation
// ---------------------------------------------------------------------------

export interface MemoryNotesProps extends React.HTMLAttributes<HTMLDivElement> {
  notes: AnalystNote[];
  onAddNote?: (content: string) => void;
}

const MemoryNotes = React.forwardRef<HTMLDivElement, MemoryNotesProps>(
  ({ className, notes, onAddNote, ...props }, ref) => {
    const [draft, setDraft] = React.useState('');

    const sorted = React.useMemo(
      () => [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      [notes],
    );

    const handleSubmit = React.useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();
        const text = draft.trim();
        if (!text) return;
        onAddNote?.(text);
        setDraft('');
      },
      [draft, onAddNote],
    );

    return (
      <div ref={ref} className={cn('flex flex-col gap-3', className)} {...props}>
        {onAddNote && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Add
            </button>
          </form>
        )}

        {sorted.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No notes yet.</div>
        ) : (
          sorted.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">{note.authorName}</span>
                  <span>&middot;</span>
                  <span>{new Date(note.createdAt).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  },
);
MemoryNotes.displayName = 'MemoryNotes';

export { MemoryNotes };
