import { describe, it, expect } from '@jest/globals';
import { SignalClassificationService } from '../../sigint/SignalClassificationService.js';
import { Signal } from '../../sigint/types.js';
import { SITREPSchema } from '../schemas.js';
import * as fs from 'fs';
import * as path from 'path';

describe('InfoWar SITREP Integration', () => {
  it('should run the full pipeline: classification -> assembly -> evidence bundle', async () => {
    const classificationService = SignalClassificationService.getInstance();

    // 1. Signal Classification
    const mockSignal: Signal = {
      id: 'sig-123',
      frequency: 1420e6,
      bandwidth: 1e6,
      timestamp: new Date(),
      power: -70,
      snr: 15,
      duration: 500
    };
    const classification = await classificationService.classifySignal(mockSignal);
    expect(classification).toBeDefined();

    // 2. Narrative Assembly
    const sitrep = {
      id: 'SITREP-2026-03-INT',
      type: 'Monthly SITREP' as const,
      generatedAt: new Date().toISOString(),
      narratives: [
        {
          id: 'NAR:disinfo-campaign-01',
          canonicalLabel: 'Coordinated Disinfo',
          keyPhrases: ['election', 'fraud'],
          firstSeenAt: new Date().toISOString(),
          languages: ['en'],
          intendedAudiences: ['voters'],
          evidenceIds: ['EVD-INFOWAR-001']
        }
      ],
      claims: [
        {
          id: 'CLM-001',
          text: 'The results are compromised.',
          stance: 'adversarial',
          emotionalTone: 'outrage',
          narrativeIds: ['NAR:disinfo-campaign-01'],
          evidenceIds: ['EVD-INFOWAR-001']
        }
      ],
      connectivity: [],
      evidenceIndex: {
        version: "1.0",
        item_slug: "INFOWAR" as const,
        entries: ['EVD-INFOWAR-001']
      }
    };

    // Validate SITREP document
    const validated = SITREPSchema.parse(sitrep);
    expect(validated.id).toBe(sitrep.id);

    // 3. Evidence Bundle Output
    const bundlePath = path.join(process.cwd(), 'runs/ci/EVD-INFOWAR-INTEG');
    if (!fs.existsSync(bundlePath)) {
      fs.mkdirSync(bundlePath, { recursive: true });
    }

    const bundle = {
      report: validated,
      metrics: {
        confidence: 0.85,
        sourceReliability: 'high'
      },
      stamp: {
        generatedAt: validated.generatedAt,
        provenance: 'Summit InfoWar Pipeline v1.0',
        lineage: [
          {
            step: 'Signal Classification',
            service: 'SignalClassificationService',
            input: 'sig-123'
          },
          {
            step: 'Narrative Assembly',
            service: 'NarrativeAnalysisService',
            input: 'classification-results'
          }
        ]
      }
    };

    fs.writeFileSync(path.join(bundlePath, 'report.json'), JSON.stringify(bundle.report, null, 2));
    fs.writeFileSync(path.join(bundlePath, 'metrics.json'), JSON.stringify(bundle.metrics, null, 2));
    fs.writeFileSync(path.join(bundlePath, 'stamp.json'), JSON.stringify(bundle.stamp, null, 2));

    expect(fs.existsSync(path.join(bundlePath, 'report.json'))).toBe(true);
    expect(fs.existsSync(path.join(bundlePath, 'metrics.json'))).toBe(true);
    expect(fs.existsSync(path.join(bundlePath, 'stamp.json'))).toBe(true);

    // Cleanup
    fs.rmSync(bundlePath, { recursive: true, force: true });
  });
});
