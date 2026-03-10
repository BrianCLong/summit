import { CanonicalEntityBase, CanonicalEntityType } from '../../core/base.js';

export interface PerspectiveEntity extends CanonicalEntityBase {
  type: CanonicalEntityType.PERSPECTIVE;

  properties: {
    actorId: string;
    goals: string[];
    emotions?: string[];
    attentionFocus?: string[];
    stakeholderClass?: string;
  };
}
