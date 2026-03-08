export type ContributorType = 'human' | 'ai' | 'mixed' | 'unknown';

export interface Contributor {
  type: ContributorType;
  model_id?: string;
}

export interface Range {
  start_line: number; // 1-indexed
  end_line: number;
  content_hash?: string;
  contributor?: Contributor;
}

export interface Conversation {
  url?: string;
  contributor?: Contributor;
  ranges: Range[];
  related?: Array<{ type: string; url: string }>;
}

export interface FileAttribution {
  path: string;
  conversations: Conversation[];
}

export interface TraceRecord {
  version: string;
  id: string; // uuid
  timestamp: string; // RFC 3339
  vcs?: {
    type: 'git' | 'jj' | 'hg' | 'svn';
    revision: string;
  };
  tool?: {
    name?: string;
    version?: string;
  };
  files: FileAttribution[];
  metadata?: Record<string, unknown>;
}
