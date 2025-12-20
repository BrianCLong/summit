import { createRequire } from 'node:module';
import { AdaptiveConsentSDK } from '../src/sdk.js';
import { PolicyTemplatePack } from '../src/types.js';

const require = createRequire(import.meta.url);
const pack = require('../templates/policyPack.json') as PolicyTemplatePack;

describe('Purpose scoping', () => {
  it('filters purposes according to scope', () => {
    const sdk = new AdaptiveConsentSDK(pack);
    const scoped = sdk.render({ locale: 'en-US', scopedPurposes: ['essential', 'analytics'] });
    expect(scoped.purposes.map((p) => p.id)).toEqual(['essential', 'analytics']);
  });
});
