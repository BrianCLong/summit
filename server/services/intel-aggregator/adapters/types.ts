export type IntelItem = {
  id: string; ts: number; source: 'news'|'filing'|'social'|'pricing'|'jobs'|'web';
  title: string; url?: string; ticker?: string; company?: string;
  entities?: string[]; sentiment?: number; summary?: string; score?: number;
};
export interface IntelAdapter {
  name: string;
  enabled(): boolean;
  pollSince(sinceTs: number): Promise<IntelItem[]>;
}