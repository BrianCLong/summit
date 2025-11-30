import { LineageGraph } from './types'

export const primaryLineageFixture: LineageGraph = {
  targetId: 'evidence-123',
  targetType: 'evidence',
  policyTags: ['PII', 'LICENSED'],
  upstream: [
    { id: 'ingest-1', label: 'S3 Intake', type: 'source', tags: ['checksum:verified'] },
    { id: 'transform-9', label: 'Entity Extraction v2', type: 'transform', tags: ['xai:explainable'] },
  ],
  downstream: [
    { id: 'claim-5', label: 'Counterfeit Alert', type: 'claim', tags: ['critical'] },
    { id: 'case-2', label: 'ACME Procurement Review', type: 'case', tags: ['warrant:required'] },
  ],
  mode: 'read-only',
}

export const restrictedLineageFixture: LineageGraph = {
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
  mode: 'read-only',
}
