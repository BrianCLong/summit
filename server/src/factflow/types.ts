export interface TimeRange {
  start: number;
  end: number;
}

export interface EvidenceItem {
  source: string;
  url?: string;
  snippet?: string;
}

export type Verdict = "verified" | "disputed" | "unverified" | "needs_review";

export interface Claim {
  id: string;
  text: string;
  speaker?: string;
  time_range: TimeRange;
  verdict: Verdict;
  confidence?: number;
  evidence?: EvidenceItem[];
}

export interface FactFlowReport {
  job_id: string;
  timestamp: string;
  claims: Claim[];
}

export interface FactFlowMetrics {
  job_id: string;
  processing_time_ms: number;
  audio_duration_sec: number;
  cache_hit: boolean;
  claims_count: number;
  verified_count: number;
  needs_review_count: number;
}

export interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
  speaker?: string;
  confidence?: number;
}

export interface Transcript {
  segments: TranscriptionSegment[];
  duration: number;
}

export interface SpeakerTurn {
  speaker: string;
  start: number;
  end: number;
}
