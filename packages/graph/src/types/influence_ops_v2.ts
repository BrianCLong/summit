export type InfluenceOpsNodeParams =
  | CampaignParams
  | NarrativeMarketParams
  | CognitiveParams
  | ProofLayerParams
  | WargameParams;

// Campaign Phase Engine
export interface CampaignParams {
  id: string;
  type: 'Campaign' | 'CampaignPhase' | 'Tactic';
  properties?: {
    name?: string;
    status?: 'ACTIVE' | 'PLANNED' | 'COMPLETED' | 'SUSPENDED';
    confidence?: number;
    [key: string]: any;
  };
}

export type CampaignEdgeType = 'HAS_PHASE' | 'PHASE_PRECEDES' | 'USES_TACTIC';

// Narrative Market
export interface NarrativeMarketParams {
  id: string;
  type: 'NarrativeMarket' | 'MarketMetric' | 'AudienceSegment' | 'Narrative' | 'NarrativeVariant';
  properties?: {
    metricType?: 'ATTENTION' | 'CREDIBILITY' | 'RETENTION';
    value?: number;
    segmentSize?: number;
    [key: string]: any;
  };
}

export type NarrativeMarketEdgeType = 'TARGETS_SEGMENT' | 'COMPETES_WITH' | 'DERIVES_FROM' | 'LOCALIZED_AS' | 'MEASURED_BY';

// Cognitive Layer
export interface CognitiveParams {
  id: string;
  type: 'CognitiveAttribute' | 'CognitiveState' | 'CognitiveSignal' | 'DefenseIntervention';
  properties?: {
    attributeName?: string;
    uncertainty?: number;
    interventionType?: string;
    [key: string]: any;
  };
}

export type CognitiveEdgeType = 'AFFECTS_ATTRIBUTE' | 'MITIGATED_BY' | 'MEASURED_BY';

// Proof Layer
export interface ProofLayerParams {
  id: string;
  type: 'ProofObject' | 'SyntheticSignal' | 'Swarm';
  properties?: {
    proofType?: 'VIDEO' | 'SCREENSHOT' | 'LEAK' | 'DOC';
    isSynthetic?: boolean;
    hash?: string;
    [key: string]: any;
  };
}

export type ProofLayerEdgeType = 'SUPPORTED_BY_PROOF' | 'LIKELY_SYNTHETIC' | 'COORDINATED_WITH';

// Wargame
export interface WargameParams {
  id: string;
  type: 'WargameScenario' | 'Faction' | 'Move' | 'Effect' | 'ImpactLink';
  properties?: {
    scenarioName?: string;
    factionName?: string;
    moveType?: string;
    [key: string]: any;
  };
}

export type WargameEdgeType = 'EXECUTES_MOVE' | 'CAUSES_EFFECT' | 'LINKS_TO_IMPACT';

export interface InfluenceOpsNode {
  id: string;
  type: string;
  properties?: Record<string, any>;
}

export interface InfluenceOpsEdge {
  source: string;
  target: string;
  type: CampaignEdgeType | NarrativeMarketEdgeType | CognitiveEdgeType | ProofLayerEdgeType | WargameEdgeType;
  properties?: Record<string, any>;
}
