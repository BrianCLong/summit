/**
 * Strategic Foresight Platform
 * Advanced foresight methodologies and strategic planning
 */

export interface StrategicForesight {
  id: string;
  title: string;
  domain: string;
  timeframe: number; // years
  methodology: ForesightMethodology;
  insights: ForesightInsight[];
  recommendations: StrategicRecommendation[];
  createdDate: Date;
}

export type ForesightMethodology =
  | 'futures-wheel'
  | 'causal-layered-analysis'
  | 'morphological-analysis'
  | 'cross-impact-analysis'
  | 'relevance-trees'
  | 'roadmapping';

export interface ForesightInsight {
  id: string;
  insight: string;
  implications: string[];
  confidence: 'low' | 'medium' | 'high';
  evidence: string[];
}

export interface StrategicRecommendation {
  id: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeframe: string;
  stakeholders: string[];
  resources: string[];
  dependencies: string[];
}

export interface MorphologicalAnalysis {
  id: string;
  problem: string;
  dimensions: AnalysisDimension[];
  configurations: Configuration[];
  consistencyMatrix: boolean[][];
}

export interface AnalysisDimension {
  name: string;
  values: string[];
}

export interface Configuration {
  id: string;
  values: Map<string, string>;
  feasibility: number;
  desirability: number;
}

export interface CausalLayer {
  litany: string[];
  systemicCauses: string[];
  worldview: string[];
  myth: string[];
}
