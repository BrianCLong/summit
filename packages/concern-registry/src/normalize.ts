import { Concern } from './types';
import { hashObject } from './hash';

export function normalizeConcern(concern: Partial<Concern>): Concern {
  const normalized: any = {
    title: concern.title || '',
    type: concern.type || '',
    domain: concern.domain || '',
    severity: concern.severity || 'medium',
    status: concern.status || 'open',
    source_signals: [...(concern.source_signals || [])].sort(),
    evidence_refs: [...(concern.evidence_refs || [])].sort(),
    owner: concern.owner || ''
  };

  if (concern.created_from) {
    normalized.created_from = concern.created_from;
  }

  const idStr = `${normalized.domain}.${normalized.type}.${hashObject(normalized)}`;
  normalized.concern_id = concern.concern_id || `concern.${idStr}`;

  return normalized as Concern;
}
