import { PolicyMetadata, PolicyTag } from '@ga-graphai/common-types';

export class PolicyTagger {
  constructor(private readonly defaults: PolicyMetadata) {}

  tag(
    text: string,
    overrides?: Partial<PolicyMetadata>,
  ): { policy: PolicyMetadata; tags: PolicyTag[] } {
    const policy: PolicyMetadata = {
      ...this.defaults,
      ...overrides,
    };
    const tags: Set<PolicyTag> = new Set();
    tags.add(`purpose:${policy.purpose}` as PolicyTag);
    tags.add(`retention:${policy.retention}` as PolicyTag);
    if (policy.licenseClass === 'MIT-OK') {
      tags.add('license:mit-ok');
    } else {
      tags.add('license:restricted');
    }
    if (policy.pii) {
      tags.add('pii:present');
    } else {
      tags.add('pii:absent');
    }
    if (/export|external/i.test(text)) {
      tags.add('purpose:compliance');
    }
    if (/secret|credential/i.test(text)) {
      policy.safetyTier = 'high';
    }
    if (/eu-only/i.test(text)) {
      policy.residency = 'eu';
    }
    return { policy, tags: Array.from(tags) as PolicyTag[] };
  }
}
