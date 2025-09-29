interface Event {
  id: string;
  caseId: string;
  type: string;
  at: string;
  actor: string;
  meta: any;
}

const events: Event[] = [];

export function record(ev: Event) {
  events.push(ev);
}

export function list(caseId: string): Event[] {
  return events.filter(e => e.caseId === caseId);
}
