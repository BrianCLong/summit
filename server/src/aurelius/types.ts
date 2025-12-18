
export interface AureliusNode {
  id: string;
  tenantId: string;
  labels: string[];
  properties: Record<string, any>;
  embedding?: number[];
}

export type Patent = AureliusNode & {
  labels: ['Patent', 'AureliusNode'];
  properties: {
    patentNumber: string;
    title: string;
    abstract: string;
    claims: string[];
    filingDate: string;
    publicationDate: string;
    inventors: string[];
    assignees: string[];
    classification: string[]; // IPC/CPC
    source: 'USPTO' | 'EPO' | 'WIPO' | 'GooglePatents';
  };
};

export type ResearchPaper = AureliusNode & {
  labels: ['ResearchPaper', 'AureliusNode'];
  properties: {
    doi: string;
    title: string;
    abstract: string;
    authors: string[];
    publicationDate: string;
    venue: string;
    source: 'ArXiv' | 'SemanticScholar' | 'IEEE' | 'ACM';
  };
};

export type Concept = AureliusNode & {
  labels: ['Concept', 'AureliusNode'];
  properties: {
    name: string;
    description: string;
    domain: string;
    noveltyScore?: number;
  };
};

export type PriorArtCluster = AureliusNode & {
  labels: ['PriorArtCluster', 'AureliusNode'];
  properties: {
    name: string;
    centroid: number[];
    density: number;
    keywords: string[];
  };
};

export type InventionDraft = AureliusNode & {
  labels: ['InventionDraft', 'AureliusNode'];
  properties: {
    title: string;
    problemStatement: string;
    noveltyArgument: string;
    claims: string[]; // Draft claims
    status: 'DRAFT' | 'REVIEW' | 'FILED' | 'REJECTED';
    noveltyScore: number;
    generatedAt: string;
  };
};

export type CompetitiveEntity = AureliusNode & {
  labels: ['CompetitiveEntity', 'AureliusNode'];
  properties: {
    name: string;
    type: 'COMPANY' | 'LAB' | 'UNIVERSITY' | 'GOV';
    domain: string[];
    riskScore: number;
  };
};

export type Opportunity = AureliusNode & {
  labels: ['Opportunity', 'AureliusNode'];
  properties: {
    title: string;
    description: string;
    type: 'FILING' | 'ACQUISITION' | 'PARTNERSHIP' | 'DEFENSE';
    impactScore: number; // 0-100
    timeSensitivity: 'LOW' | 'MEDIUM' | 'HIGH';
    status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  };
};

export type ForesightScenario = AureliusNode & {
  labels: ['ForesightScenario', 'AureliusNode'];
  properties: {
    name: string;
    description: string;
    timeline: string; // e.g., "18-48 months"
    probability: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    parameters: Record<string, any>;
  };
};
