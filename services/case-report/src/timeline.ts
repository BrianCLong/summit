export type Event = { id: string; ts: string; label: string };

export function sortEvents(e: Event[]) {
  return [...e].sort((a, b) => a.ts.localeCompare(b.ts));
}
