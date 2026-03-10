export interface BitemporalWindow {
  valid_from: string;
  valid_to?: string | null;
}

export interface ReplayCutoff {
  asKnownAt: string;
  asOf?: string;
