/**
 * Core types for narrative tracking system
 */

export interface Narrative {
  id: string;
  title: string;
  description: string;
  storyArc: StoryArc;
  framing: NarrativeFraming;
  themes: string[];
  actors: NarrativeActor[];
  timeline: NarrativeEvent[];
  sentiment: number;
  prevalence: number;
  firstSeen: Date;
  lastSeen: Date;
  sources: string[];
  metadata?: Record<string, any>;
}

export interface StoryArc {
  exposition: string[];
  risingAction: string[];
  climax: string[];
  fallingAction: string[];
  resolution: string[];
  arcType: 'hero' | 'tragedy' | 'rebirth' | 'quest' | 'voyage' | 'comedy' | 'rags-to-riches';
}

export interface NarrativeFraming {
  mainFrame: string;
  subFrames: string[];
  framingDevices: FramingDevice[];
  perspective: 'first-person' | 'second-person' | 'third-person';
  tone: 'neutral' | 'positive' | 'negative' | 'alarmist' | 'celebratory';
}

export interface FramingDevice {
  type: 'metaphor' | 'analogy' | 'contrast' | 'causation' | 'moral' | 'economic' | 'conflict';
  description: string;
  examples: string[];
}

export interface NarrativeActor {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'victim' | 'hero' | 'villain';
  attributes: string[];
  actions: string[];
}

export interface NarrativeEvent {
  timestamp: Date;
  description: string;
  type: 'mention' | 'amplification' | 'mutation' | 'counter';
  source: string;
  reach?: number;
}

export interface CounterNarrative {
  originalNarrativeId: string;
  counterNarrativeId: string;
  relationshipType: 'refutation' | 'alternative' | 'context' | 'debunk';
  strength: number;
  evidence: string[];
}

export interface NarrativeEvolution {
  narrativeId: string;
  versions: NarrativeVersion[];
  divergencePoints: DivergencePoint[];
  convergencePoints: ConvergencePoint[];
}

export interface NarrativeVersion {
  version: number;
  timestamp: Date;
  changes: string[];
  narrative: Narrative;
}

export interface DivergencePoint {
  timestamp: Date;
  originalVersion: number;
  newBranches: string[];
  reason: string;
}

export interface ConvergencePoint {
  timestamp: Date;
  mergedVersions: number[];
  resultingVersion: number;
  reason: string;
}

export interface NarrativeCluster {
  id: string;
  narratives: string[];
  centralTheme: string;
  coherence: number;
  size: number;
}
