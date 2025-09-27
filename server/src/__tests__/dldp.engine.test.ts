import {
  DerivationPlanner,
  generatePolicyChangePR,
  signManifest,
  type DerivationRequest,
  type LicensedAsset,
  type ManifestSigner,
} from '../dldp/engine';

describe('DerivationPlanner', () => {
  const signer: ManifestSigner = {
    id: 'licensing-bot',
    secret: 'super-secret-signing-key',
  };

  const datasetA: LicensedAsset = {
    id: 'dataset-a',
    kind: 'dataset',
    name: 'Research-only dataset',
    terms: {
      commercialUse: 'non-commercial',
      requiresAttribution: true,
      shareAlike: true,
      fieldOfUseRestrictions: ['defense'],
      purposeRestrictions: ['surveillance'],
      revenueShare: 0.1,
    },
  };

  const datasetB: LicensedAsset = {
    id: 'dataset-b',
    kind: 'dataset',
    name: 'Medical imaging corpus',
    terms: {
      commercialUse: 'allowed',
      requiresAttribution: false,
      fieldOfUseRestrictions: ['weapons'],
      purposeRestrictions: ['credit-scoring'],
      revenueShare: 0.2,
      revocation: {
        deletionRequired: true,
        noticePeriodDays: 45,
      },
    },
  };

  const fineTunedModel: LicensedAsset = {
    id: 'model-c',
    kind: 'model',
    name: 'Base model v3',
    version: '3.2.0',
    terms: {
      commercialUse: 'allowed',
      requiresAttribution: true,
      shareAlike: false,
      purposeRestrictions: ['disinformation'],
    },
  };

  const requestedOutputs: DerivationRequest['requestedOutputs'] = [
    {
      id: 'derivative-model',
      type: 'model',
      description: 'Fine-tuned classifier for pathology triage',
      commercialization: 'external',
      tags: ['pathology', 'triage'],
    },
    {
      id: 'internal-eval',
      type: 'service',
      description: 'Internal evaluation endpoint for clinicians',
      commercialization: 'internal',
      tags: ['clinical-evaluation'],
    },
  ];

  it('denies commercial plans that violate non-commercial terms', () => {
    const planner = new DerivationPlanner(signer);
    const plan = planner.plan({
      inputs: [datasetA, datasetB, fineTunedModel],
      intendedUse: {
        commercial: true,
        fieldsOfUse: ['healthcare'],
        purposes: ['diagnostics'],
      },
      requestedOutputs,
    });

    expect(plan.allowed).toBe(false);
    expect(plan.reasons).toContain(
      'Research-only dataset is limited to non-commercial use, blocking the requested plan.'
    );
    expect(plan.allowedOutputs).toEqual([]);
  });

  it('produces signed manifest with aggregated obligations for compliant plans', () => {
    const planner = new DerivationPlanner(signer);
    const manifest = planner.createManifest({
      inputs: [datasetA, datasetB, fineTunedModel],
      intendedUse: {
        commercial: false,
        fieldsOfUse: ['healthcare'],
        purposes: ['diagnostics'],
      },
      requestedOutputs,
    });

    expect(manifest.allowed).toBe(true);
    expect(manifest.constraints.commercialUse).toBe('non-commercial');
    expect(manifest.constraints.shareAlike).toBe(true);
    expect(manifest.constraints.fieldOfUse).toEqual(['defense', 'weapons']);
    expect(manifest.constraints.purpose).toEqual([
      'credit-scoring',
      'disinformation',
      'surveillance',
    ]);

    expect(manifest.obligations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'attribution' }),
        expect.objectContaining({ type: 'share-alike' }),
        expect.objectContaining({ type: 'field-restriction' }),
        expect.objectContaining({ type: 'purpose-restriction' }),
        expect.objectContaining({ type: 'revenue-share' }),
        expect.objectContaining({ type: 'revocation' }),
      ])
    );

    const externalOutput = manifest.allowedOutputs.find(
      (output) => output.id === 'derivative-model'
    );
    expect(externalOutput?.conditions).toContain(
      'Limit distribution to non-commercial programs.'
    );

    const { signature, signedBy, ...unsigned } = manifest;
    expect(signManifest(unsigned, signer)).toBe(signature);
    expect(signedBy).toEqual({ id: 'licensing-bot', algorithm: 'sha256' });
  });

  it('generates policy change PR text referencing manifest context', () => {
    const planner = new DerivationPlanner(signer);
    const manifest = planner.createManifest({
      inputs: [datasetA, datasetB, fineTunedModel],
      intendedUse: {
        commercial: false,
        fieldsOfUse: ['healthcare'],
        purposes: ['diagnostics'],
      },
      requestedOutputs,
    });

    const prBody = generatePolicyChangePR({
      manifest,
      policyDiffSummary:
        'Align downstream policy tags with non-commercial and share-alike duties.',
      addedTags: ['share-alike', 'non-commercial'],
      removedTags: ['legacy-commercial'],
      targetBranch: 'policy/dldp-updates',
    });

    expect(prBody).toContain('# Policy Update Proposal');
    expect(prBody).toContain('Align downstream policy tags');
    expect(prBody).toContain('Added tags: non-commercial, share-alike');
    expect(prBody).toContain(`Manifest ID: ${manifest.manifestId}`);
    expect(prBody).toContain('Decision: ALLOW');
  });
});

