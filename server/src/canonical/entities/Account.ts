/**
 * Canonical Entity: Account
 *
 * Represents financial or digital accounts
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CanonicalAccount extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Account';

  /** Account identifier/number */
  accountNumber: string;

  /** Account type (e.g., Bank, Crypto, SocialMedia, Email) */
  accountType: string;

  /** Provider/Platform */
  provider: string;

  /** Holder entity ID */
  holderId?: string;

  /** Status */
  status?: string;

  /** Balance/Metrics */
  metrics?: Record<string, any>;

  /** Additional properties */
  properties: Record<string, any>;
}
