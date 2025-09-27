import type { MacroName, PolicyId } from './types.js';

export interface PolicyMappingEntry {
  readonly id: PolicyId;
  readonly macro: MacroName;
  readonly rule: string;
  readonly rationale: string;
  readonly notes: string;
}

export const POLICY_MAPPING: ReadonlyArray<PolicyMappingEntry> = Object.freeze([
  {
    id: 'SRPL-001',
    macro: 'entityById',
    rule: 'Single-record lookups MUST bind identifiers rather than interpolating user input.',
    rationale:
      'Ensures primary key fetches leverage a fixed statement with positional bind parameters, '
      + 'eliminating SQL injection risk on id equality filters.',
    notes: 'Use when retrieving a single row by its unique identifier. Optional columns limit projection.',
  },
  {
    id: 'SRPL-002',
    macro: 'entitiesByForeignKey',
    rule: 'One-to-many traversals MUST constrain on a foreign key with stable ordering and optional row caps.',
    rationale:
      'Avoids dynamic SQL construction for relationship queries and enforces deterministic pagination semantics.',
    notes: 'Supports optional sorting and row limits to keep fan-out under control.',
  },
  {
    id: 'SRPL-003',
    macro: 'searchByPrefix',
    rule: 'Search inputs MUST apply wildcard operators via bind parameters rather than string concatenation.',
    rationale:
      'Guards prefix matching workloads against injection while normalizing comparison semantics.',
    notes: 'Automatically appends % to the prefix and defaults to case-insensitive ILIKE matching.',
  },
  {
    id: 'SRPL-004',
    macro: 'listActive',
    rule: 'Status filters MUST rely on canonical flags with bounded result sets.',
    rationale:
      'Encourages centralized activation semantics and keeps list queries scoped to active records only.',
    notes: 'Default active flag is `is_active = true`; accepts optional projections and limits.',
  },
]);

export const policyByMacro: ReadonlyMap<MacroName, PolicyMappingEntry> = new Map(
  POLICY_MAPPING.map((entry) => [entry.macro, entry]),
);

export const policyById: ReadonlyMap<PolicyId, PolicyMappingEntry> = new Map(
  POLICY_MAPPING.map((entry) => [entry.id, entry]),
);
