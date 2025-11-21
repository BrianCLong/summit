import { createRequire } from 'node:module';
import { AdaptiveConsentSDK } from '../src/sdk.js';
import { PolicyTemplatePack } from '../src/types.js';

const require = createRequire(import.meta.url);
const pack = require('../templates/policyPack.json') as PolicyTemplatePack;

describe('AdaptiveConsentSDK rendering', () => {
  const sdk = new AdaptiveConsentSDK(pack);
  const locales = Object.keys(pack.locales);

  test.each(locales)('renders %s locale consistently', (locale) => {
    const dialog = sdk.render({ locale });
    expect(dialog).toMatchSnapshot();
  });
});
