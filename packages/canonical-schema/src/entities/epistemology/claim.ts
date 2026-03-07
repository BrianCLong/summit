import { CanonicalEntityBase, CanonicalEntityType } from '../../core/base.js';

export interface ClaimEntity extends CanonicalEntityBase {
  type: CanonicalEntityType.CLAIM;

  properties: {
    content: string;
    domain: string;
    scope: string;
    status: 'HYPOTHESIS' | 'ACCEPTED' | 'DEPRECATED' | 'DISPUTED';
    epistemicUncertainty?: number;
    aleatoricUncertainty?: number;
  };
}
