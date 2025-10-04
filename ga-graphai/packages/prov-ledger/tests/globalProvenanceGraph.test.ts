import { describe, expect, it } from 'vitest';
import {
  GlobalProvenanceGraph,
  ArtifactInput,
  BenchmarkDatasetEntry,
  AttackScenario,
} from '../src/globalProvenanceGraph.js';

describe('GlobalProvenanceGraph', () => {
  const createGraphWithSeed = () => {
    const graph = new GlobalProvenanceGraph();
    const seed: ArtifactInput = {
      uri: 'https://git.example/os-project/README.md',
      content: 'Hello world open source manifesto',
      kind: 'text',
      contributors: ['alice'],
      tags: ['source'],
    };
    const origin = graph.ingestArtifact(seed);

    const translation = graph.ingestArtifact(
      {
        uri: 'https://mirror.example/blog/hola',
        content: 'hola mundo manifiesto de codigo abierto',
        kind: 'text',
        contributors: ['translator-bot'],
        tags: ['translation'],
      },
      {
        sourceIds: [origin.id],
        transformation: 'translation',
        description: 'translation laundering playbook',
        evidence: ['https://mirror.example/blog/hola#rev1'],
      },
    );

    const meme = graph.ingestArtifact(
      {
        uri: 'ipfs://example/meme.png',
        content: Buffer.from('image-bytes'),
        kind: 'image',
        contributors: ['meme-lord'],
        tags: ['deepfake'],
      },
      {
        sourceIds: [translation.id],
        transformation: 'visual remix',
        description: 'overlayed manifesto text on image',
        evidence: ['hash://sha256/1234'],
      },
    );

    graph.recordAmplification(meme.id, {
      platform: 'social.example',
      audience: 'global',
      reach: 120000,
      timestamp: new Date().toISOString(),
      narrative: 'bots pushing altered manifesto',
      tactic: 'botnet amplification',
    });

    return { graph, origin, translation, meme };
  };

  it('traces provenance with cryptographic continuity across modalities', () => {
    const { graph, translation, meme } = createGraphWithSeed();

    const explanation = graph.explain(meme.id);
    expect(explanation).toContain('visual remix');
    expect(explanation).toContain(translation.uri);

    const viz = graph.visualize(meme.id, 4);
    expect(viz.nodes.length).toBeGreaterThanOrEqual(2);
    expect(viz.edges.length).toBe(2);
    expect(Object.keys(viz.amplification)).toContain(meme.id);
  });

  it('generates tailored reports for investigative audiences', () => {
    const { graph, meme } = createGraphWithSeed();

    const osintReport = graph.generateReport('osint', {
      targetId: meme.id,
      includeAmplification: true,
    });
    expect(osintReport).toContain('Provenance dossier');
    expect(osintReport).toContain('Amplification');

    const legalReport = graph.generateReport('legal', {
      targetId: meme.id,
      includeAmplification: false,
    });
    expect(legalReport).toContain('chain-of-custody');
  });

  it('benchmarks fingerprinting against industry reference schemes', () => {
    const { graph } = createGraphWithSeed();
    const dataset: BenchmarkDatasetEntry[] = [
      { id: 't1', kind: 'text', content: 'Open protocols for provenance' },
      { id: 'v1', kind: 'video', content: 'frame0 frame1 frame2 frame3' },
      { id: 'm1', kind: 'model', content: { layers: 2, params: 128 } },
    ];

    const result = graph.runBenchmark(dataset, 2);
    expect(result.datasetSize).toBe(6);
    expect(result.summaries).toHaveLength(3);
    expect(result.summaries[0].scheme).toContain('Global Provenance Graph');
  });

  it('detects adversarial tampering attempts', () => {
    const { graph, translation } = createGraphWithSeed();
    const scenarios: AttackScenario[] = [
      {
        id: 'attack-1',
        sourceArtifactId: translation.id,
        manipulatedContent: '完全不同的宣言內容',
        description: 'foreign language overwrite',
        expectedOutcome: 'detected',
      },
    ];

    const results = graph.simulateAttackResistance(scenarios, 0.7);
    expect(results[0].detected).toBe(true);
    expect(results[0].similarity).toBeLessThan(0.7);
  });

  it('surfaces adversarial disinformation tactics', () => {
    const { graph, meme } = createGraphWithSeed();
    const tactics = graph.analyzeAdversarialTactics(meme.id);
    expect(tactics).toContain('Coordinated botnet amplification');
    expect(tactics).toContain('Language translation laundering');
    expect(tactics).toContain('Synthetic media injection');
  });
});
