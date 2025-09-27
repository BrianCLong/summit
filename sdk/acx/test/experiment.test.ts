import { createRequire } from 'node:module';
import { jest } from '@jest/globals';
import { AdaptiveConsentSDK } from '../src/sdk.js';
import { PolicyTemplatePack } from '../src/types.js';

const require = createRequire(import.meta.url);
const pack = require('../templates/policyPack.json') as PolicyTemplatePack;

const createSdk = () => new AdaptiveConsentSDK(pack);

describe('Experiment handling', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows UI-only variants', () => {
    const sdk = createSdk();
    sdk.registerExperiment({
      name: 'dialog-theme',
      controlVariant: {
        id: 'control',
        probability: 0.5,
        uiOverrides: {
          title: 'Your privacy choices'
        }
      },
      variants: [
        {
          id: 'compact',
          probability: 0.5,
          uiOverrides: {
            title: 'Privacy settings',
            manageCta: 'Adjust preferences'
          }
        }
      ]
    });

    jest.spyOn(Math, 'random').mockReturnValue(0.8);
    const dialog = sdk.render({ locale: 'en-US', experiment: 'dialog-theme' });
    expect(dialog.variant).toBe('compact');
    expect(dialog.copy.manageCta).toBe('Adjust preferences');
    expect(dialog.purposes.map((p) => p.id)).toEqual(['essential', 'analytics', 'personalization']);
  });

  it('rejects variants that alter semantics', () => {
    const sdk = createSdk();
    expect(() =>
      sdk.registerExperiment({
        name: 'bad-variant',
        controlVariant: {
          id: 'control',
          probability: 1
        },
        variants: [
          {
            id: 'coerce',
            probability: 0,
            uiOverrides: {
              summary: 'Accept to continue'
            }
          }
        ]
      })
    ).toThrow('changes consent semantics');
  });
});
