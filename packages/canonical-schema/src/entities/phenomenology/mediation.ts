import { CanonicalEntityBase, CanonicalEntityType } from '../../core/base.js';

export interface MediationEntity extends CanonicalEntityBase {
  type: CanonicalEntityType.MEDIATION;

  properties: {
    mediatorId: string;
    alterationType: 'WARNING' | 'COGNITIVE_LOAD_REDUCTION' | 'AMBIGUITY_INTRODUCTION' | 'OTHER';
    description: string;
    phenomenologicalGap?: {
      confusionDelta?: number;
      surpriseDelta?: number;
      trustDelta?: number;
    };
  };
}
