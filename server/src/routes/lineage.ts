import { Router } from 'express';

export interface LineageNode {
  id: string;
  type: 'evidence' | 'claim' | 'entity' | 'transform' | 'source' | 'case' | 'report';
  label: string;
  badges?: Array<{
    text: string;
    variant: 'info' | 'warning' | 'error' | 'success';
  }>;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  stableId: string;
}

export interface LineageEdge {
  from: string;
  to: string;
  label?: string;
  relationshipType: 'derived_from' | 'related_to' | 'part_of' | 'contains';
  stableId: string;
}

export interface LayoutHints {
  grouping: Array<{
    groupId: string;
    label: string;
    nodeIds: string[];
    layout: 'cluster' | 'stack';
  }>;
}

export interface LineageGraphResponse {
  nodes: LineageNode[];
  edges: LineageEdge[];
  layoutHints?: LayoutHints;
}

export interface LineageLink {
  id: string;
  label: string;
  type: 'source' | 'transform' | 'claim' | 'case' | 'report';
  tags: string[];
  restricted?: boolean;
}

export interface LineageResponse {
  targetId: string;
  targetType: 'evidence' | 'case' | 'claim';
  policyTags: string[];
  upstream: LineageLink[];
  downstream: LineageLink[];
  restricted?: boolean;
  restrictionReason?: string;
}

const lineageFixtures: Record<string, LineageResponse> = {
  'evidence-123': {
    targetId: 'evidence-123',
    targetType: 'evidence',
    policyTags: ['PII', 'LICENSED'],
    upstream: [
      {
        id: 'ingest-1',
        label: 'S3 Intake',
        type: 'source',
        tags: ['checksum:verified'],
      },
      {
        id: 'transform-9',
        label: 'Entity Extraction v2',
        type: 'transform',
        tags: ['xai:explainable'],
      },
    ],
    downstream: [
      {
        id: 'claim-5',
        label: 'Counterfeit Alert',
        type: 'claim',
        tags: ['critical'],
      },
      {
        id: 'case-2',
        label: 'ACME Procurement Review',
        type: 'case',
        tags: ['warrant:required'],
      },
    ],
  },
  'case-locked': {
    targetId: 'case-locked',
    targetType: 'case',
    policyTags: ['WARRANT_ONLY'],
    upstream: [
      {
        id: 'ingest-7',
        label: 'Secure Source',
        type: 'source',
        tags: ['sealed'],
        restricted: true,
      },
    ],
    downstream: [],
    restricted: true,
    restrictionReason: 'Access requires warrant-based clearance for upstream nodes.',
  },
};

const lineageGraphFixture: LineageGraphResponse = {
  nodes: [
    {
      id: 'evidence-1',
      stableId: 'ev-1',
      type: 'evidence',
      label: 'Email Attachment',
      badges: [{ text: 'PII', variant: 'warning' }],
    },
    { id: 'transform-1', stableId: 'tr-1', type: 'transform', label: 'Extract Entities' },
    { id: 'claim-1', stableId: 'cl-1', type: 'claim', label: 'Claim: ACME Corp mentioned' },
    {
      id: 'entity-1',
      stableId: 'en-1',
      type: 'entity',
      label: 'ACME Corp',
      badges: [{ text: 'High Confidence', variant: 'success' }],
    },
    { id: 'case-1', stableId: 'ca-1', type: 'case', label: 'Case #1234' },
  ],
  edges: [
    {
      from: 'evidence-1',
      to: 'transform-1',
      relationshipType: 'derived_from',
      label: 'processed',
      stableId: 'ev-1:tr-1',
    },
    {
      from: 'transform-1',
      to: 'claim-1',
      relationshipType: 'derived_from',
      label: 'created',
      stableId: 'tr-1:cl-1',
    },
    { from: 'claim-1', to: 'entity-1', relationshipType: 'related_to', stableId: 'cl-1:en-1' },
    { from: 'case-1', to: 'claim-1', relationshipType: 'contains', stableId: 'ca-1:cl-1' },
    { from: 'case-1', to: 'evidence-1', relationshipType: 'contains', stableId: 'ca-1:ev-1' },
  ],
  layoutHints: {
    grouping: [
      {
        groupId: 'evidence-cluster',
        label: 'Evidence Cluster',
        nodeIds: ['evidence-1', 'transform-1'],
        layout: 'cluster',
      },
    ],
  },
};

const lineageRouter = Router();

const LINEAGE_UI_CONTRACT = process.env.LINEAGE_UI_CONTRACT === 'true';

if (LINEAGE_UI_CONTRACT) {
  lineageRouter.get('/graph', (req, res) => {
    const entityId = typeof req.query.entityId === 'string' ? req.query.entityId : null;
    const fieldPath = typeof req.query.fieldPath === 'string' ? req.query.fieldPath : null;
    const collapse = Array.isArray(req.query.collapse)
      ? req.query.collapse.filter((v): v is string => typeof v === 'string').join(',')
      : typeof req.query.collapse === 'string'
        ? req.query.collapse
        : '';

    if (!entityId || !fieldPath) {
      return res.status(400).json({
        message: 'entityId and fieldPath are required query parameters.',
      });
    }

    let response = { ...lineageGraphFixture };

    if (collapse.length > 0) {
      const collapsedNodeIds = new Set<string>();
      if (collapse.includes('evidence')) {
        response.layoutHints?.grouping.forEach(group => {
          if (group.groupId === 'evidence-cluster') {
            group.nodeIds.forEach(id => collapsedNodeIds.add(id));
          }
        });
      }

      response.nodes = response.nodes.filter(node => !collapsedNodeIds.has(node.id));
      response.edges = response.edges.filter(
        edge => !collapsedNodeIds.has(edge.from) && !collapsedNodeIds.has(edge.to)
      );
    }
    return res.json(response);
  });
}

lineageRouter.get('/:id', (req, res) => {
  const lineage = lineageFixtures[req.params.id];
  if (!lineage) {
    return res.status(404).json({ message: 'Lineage not found for the requested id' });
  }
  return res.json({ ...lineage, mode: 'read-only' });
});

export default lineageRouter;
