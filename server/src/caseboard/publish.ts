import { RedactionService } from '../redaction/redact.js';

export interface PublishPolicy {
  rules: Array<'pii' | 'financial' | 'sensitive'>;
  kAnonThreshold?: number;
  allowedFields?: string[];
  redactionMask?: string;
}

export const defaultPublishPolicy: PublishPolicy = {
  rules: ['pii', 'financial', 'sensitive'],
};

export interface PublishResult<T> {
  snapshot: T;
  policy: PublishPolicy;
}

export async function sanitizeCaseboardSnapshot<T>(
  snapshot: T,
  tenantId: string,
  policy: PublishPolicy = defaultPublishPolicy,
): Promise<PublishResult<T>> {
  const redactionService = new RedactionService();
  const sanitized = await redactionService.redactObject(
    snapshot,
    policy,
    tenantId,
    { channel: 'caseboard_publish' },
  );
  return {
    snapshot: sanitized as T,
    policy,
  };
}
