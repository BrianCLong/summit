import { Router } from 'express';

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

const lineageRouter = Router();

lineageRouter.get('/:id', (req, res) => {
  const lineage = lineageFixtures[req.params.id];
  if (!lineage) {
    return res.status(404).json({ message: 'Lineage not found for the requested id' });
  }
  return res.json({ ...lineage, mode: 'read-only' });
});

export default lineageRouter;
