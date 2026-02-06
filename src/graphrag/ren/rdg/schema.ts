export const RDG_NODES = {
  INTERNAL_ASSET: 'InternalAsset',
  PROGRAM: 'Program',
  FACILITY: 'Facility',
  SUPPLIER: 'Supplier',
  AGENCY: 'Agency',
  COURT: 'Court',
  COUNTERPARTY: 'Counterparty',
  LAW_FIRM: 'LawFirm',
  ARTIFACT: 'Artifact',
  FACT: 'RDGFact'
} as const;

export const RDG_EDGES = {
  MENTIONS: 'MENTIONS',
  DISCLOSES_ABOUT: 'DISCLOSES_ABOUT',
  CORROBORATES: 'CORROBORATES',
  FILED_WITH: 'FILED_WITH',
  RESPONDED_BY: 'RESPONDED_BY',
  LINKED_CASE: 'LINKED_CASE',
  PROTECTIVE_ORDER_APPLIES: 'PROTECTIVE_ORDER_APPLIES',
  SEALED_STATUS: 'SEALED_STATUS',
  REVEALS_FACT: 'REVEALS_FACT'
} as const;

export interface RDGNode {
  id: string;
  type: string;
  properties: Record<string, any>;
}

export interface RDGEdge {
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}
