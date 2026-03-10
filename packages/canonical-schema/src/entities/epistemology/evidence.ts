import { CanonicalEntityBase, CanonicalEntityType } from '../../core/base.js';

export interface EvidenceEntity extends CanonicalEntityBase {
  type: CanonicalEntityType.EVIDENCE;

  properties: {
    evidenceType: 'OBSERVATION' | 'DOCUMENT' | 'RUN' | 'HUMAN_JUDGMENT';
    pointer: string; // ID or URL
    strength: number; // 0.0 to 1.0
  };
}
