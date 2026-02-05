import { FeatureFlags } from '../../config/featureFlags.js';

export type BackendId = 'neo4j' | 'neptuneManaged' | 'tigergraph';

export interface BackendCapabilities {
  id: BackendId;
  label: string;
  graphTraversal: boolean;
  vectorSearch: boolean;
  hybridSearchNative: boolean;
  graphragManaged: boolean;
  graphragToolkit: boolean;
  agentIntegrations: boolean;
  licensing: 'oss' | 'commercial' | 'managed';
  available: boolean;
  notes: string[];
}

const baseCapabilities: Record<BackendId, Omit<BackendCapabilities, 'available'>> = {
  neo4j: {
    id: 'neo4j',
    label: 'Neo4j',
    graphTraversal: true,
    vectorSearch: false,
    hybridSearchNative: false,
    graphragManaged: false,
    graphragToolkit: false,
    agentIntegrations: false,
    licensing: 'commercial',
    notes: [
      'Graph traversal is available.',
      'Hybrid retrieval requires external vector store.',
      'Community Edition is GPLv3; Enterprise requires a commercial license.',
    ],
  },
  neptuneManaged: {
    id: 'neptuneManaged',
    label: 'AWS Neptune (Managed GraphRAG)',
    graphTraversal: true,
    vectorSearch: true,
    hybridSearchNative: false,
    graphragManaged: true,
    graphragToolkit: true,
    agentIntegrations: true,
    licensing: 'managed',
    notes: [
      'Managed GraphRAG via Bedrock Knowledge Bases.',
      'Adapter is feature-flagged and requires explicit config.',
    ],
  },
  tigergraph: {
    id: 'tigergraph',
    label: 'TigerGraph',
    graphTraversal: true,
    vectorSearch: true,
    hybridSearchNative: true,
    graphragManaged: false,
    graphragToolkit: false,
    agentIntegrations: false,
    licensing: 'commercial',
    notes: ['Native hybrid search combines graph and vector retrieval.'],
  },
};

const isNeptuneEnabled = () => {
  const flags = FeatureFlags.getInstance();
  return flags.isEnabled('graphrag.neptuneManaged');
};

export const getBackendCapabilities = (): BackendCapabilities[] => {
  return (Object.keys(baseCapabilities) as BackendId[]).map((id) => {
    const entry = baseCapabilities[id];
    const available = id === 'neptuneManaged' ? isNeptuneEnabled() : true;
    return {
      ...entry,
      available,
    };
  });
};

export const getBackendCapabilityMap = (): Record<BackendId, BackendCapabilities> => {
  return getBackendCapabilities().reduce((acc, capability) => {
    acc[capability.id] = capability;
    return acc;
  }, {} as Record<BackendId, BackendCapabilities>);
};
