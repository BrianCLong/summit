export interface ScopeDiff {
  added: Record<string, string[]>;
  removed: Record<string, string[]>;
  unchanged: Record<string, string[]>;
}

export interface CustodyEvent {
  sequence: number;
  timestamp: string;
  holdId: string;
  system: string;
  action: 'apply' | 'verify';
  scopeFingerprint: string;
  prevHash: string;
  hash: string;
}

export interface HoldReport {
  system: string;
  frozenResources: string[];
  snapshotted: string[];
  tagged: Record<string, Record<string, string>>;
}

export interface HoldDataset {
  holdId: string;
  issuedAt: string;
  window: {
    start: string;
    end: string;
  };
  scope: Record<string, string[]>;
  scopeDiff: ScopeDiff;
  custodyChain: CustodyEvent[];
  reports: HoldReport[];
}
