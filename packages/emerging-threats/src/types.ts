/**
 * Emerging Threats and Futures Intelligence Platform
 * Types and interfaces for threat identification and futures analysis
 */

export type ThreatCategory =
  | 'artificial-intelligence'
  | 'quantum-computing'
  | 'biotechnology'
  | 'nanotechnology'
  | 'synthetic-biology'
  | 'brain-computer-interface'
  | 'advanced-robotics'
  | 'directed-energy-weapons'
  | 'hypersonic-technologies'
  | 'space-capabilities'
  | 'autonomous-weapons'
  | 'swarm-technologies'
  | 'cognitive-warfare'
  | 'information-warfare';

export type ThreatLevel = 'nascent' | 'emerging' | 'developing' | 'mature' | 'imminent';

export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'very-high';

export interface EmergingThreat {
  id: string;
  name: string;
  category: ThreatCategory;
  threatLevel: ThreatLevel;
  confidence: ConfidenceLevel;
  description: string;
  firstDetected: Date;
  lastUpdated: Date;
  indicators: ThreatIndicator[];
  sources: ThreatSource[];
  relatedThreats: string[];
  mitigation?: MitigationStrategy;
  impact: ThreatImpact;
  timeframe: ThreatTimeframe;
}

export interface ThreatIndicator {
  type: 'research-publication' | 'patent-filing' | 'funding-announcement' | 'capability-demonstration' | 'field-test' | 'deployment';
  description: string;
  timestamp: Date;
  source: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
  verified: boolean;
}

export interface ThreatSource {
  id: string;
  type: 'academic' | 'defense-research' | 'commercial' | 'intelligence' | 'open-source' | 'classified';
  name: string;
  url?: string;
  credibility: ConfidenceLevel;
  classification?: string;
}

export interface ThreatImpact {
  military: 'low' | 'medium' | 'high' | 'critical';
  economic: 'low' | 'medium' | 'high' | 'critical';
  political: 'low' | 'medium' | 'high' | 'critical';
  societal: 'low' | 'medium' | 'high' | 'critical';
  technological: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedDomains: string[];
}

export interface ThreatTimeframe {
  nearTerm: boolean; // 0-2 years
  midTerm: boolean; // 2-5 years
  longTerm: boolean; // 5+ years
  estimatedDeployment?: Date;
  uncertaintyLevel: ConfidenceLevel;
}

export interface MitigationStrategy {
  approaches: string[];
  requiredCapabilities: string[];
  timeline: string;
  resources: string[];
  effectiveness: ConfidenceLevel;
}

export interface TechnologyTrend {
  id: string;
  name: string;
  domain: string;
  trajectory: 'accelerating' | 'steady' | 'decelerating' | 'plateauing';
  maturityLevel: number; // 1-9 (TRL scale)
  adoptionRate: number; // percentage
  investmentLevel: 'low' | 'medium' | 'high' | 'very-high';
  keyPlayers: string[];
  breakthroughs: TechnologyBreakthrough[];
  convergencePoints: string[];
}

export interface TechnologyBreakthrough {
  id: string;
  title: string;
  description: string;
  date: Date;
  organization: string;
  significance: 'incremental' | 'significant' | 'major' | 'paradigm-shift';
  technicalDetails?: string;
  publications?: string[];
  patents?: string[];
}

export interface DisruptiveThreat {
  id: string;
  name: string;
  type: 'attack-vector' | 'warfare-tactic' | 'gray-zone-operation' | 'hybrid-warfare' | 'information-operation';
  description: string;
  unconventionalAspects: string[];
  targetedAsymmetries: string[];
  countermeasures: string[];
  historicalPrecedents?: string[];
  scenarios: ThreatScenario[];
  likelihood: ConfidenceLevel;
}

export interface ThreatScenario {
  id: string;
  title: string;
  description: string;
  triggers: string[];
  consequences: string[];
  indicators: string[];
  timeframe: ThreatTimeframe;
  probability: number; // 0-100
}

export interface WeakSignal {
  id: string;
  signal: string;
  context: string;
  detectedDate: Date;
  source: string;
  potentialImplications: string[];
  relatedTrends: string[];
  monitoringStatus: 'active' | 'escalated' | 'dismissed' | 'archived';
  strengthening: boolean;
}

export interface WildCard {
  id: string;
  event: string;
  description: string;
  probability: 'very-low' | 'low' | 'uncertain';
  impact: 'high' | 'very-high' | 'catastrophic';
  domains: string[];
  precursors?: string[];
  cascadingEffects: string[];
}
