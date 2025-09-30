export type TimelineKind =
  | 'email.thread'
  | 'email.message'
  | 'meeting'
  | 'meeting.notes'
  | 'call.transcript.chunk'
  | 'call.transcript.final'
  | 'slides.presented'
  | 'slides.pointer'
  | 'asset.image'
  | 'asset.video'
  | 'summary'
  | 'task'
  | 'ticket';

export interface TimelineEvent {
  id: string;
  contactId: string;
  kind: TimelineKind;
  ts: string; // ISO
  sentiment?: { score: number; label: 'neg'|'neu'|'pos'; confidence?: number };
  tags?: string[];
  payload: any; // shaped by kind (see below)
  source: { system: 'gmail'|'graph'|'stage'|'present'|'notes'|'ingest'|'summarizer'; id?: string };
}