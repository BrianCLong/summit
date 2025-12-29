import { describe, it, expect } from '@jest/globals';
import { PaletteSelector } from '../palette/selector.js';
import { applyPaletteInjection } from '../palette/injection.js';
import { LLMRouter } from '../router.js';
import { MockProvider } from '../providers/mock.js';
import { PaletteProvenanceRecorder } from '../palette/provenance.js';
import { PaletteRuntimeConfig } from '../palette/types.js';
import { ChatMessage } from '../types.js';

const runtimeEnabled: PaletteRuntimeConfig = {
  enabled: true,
  defaultPaletteId: 'concise_exec',
  allowExploration: true,
  maxK: 3,
};

describe('Reasoning Palette core', () => {
  it('selects fixed palette deterministically', () => {
    const selector = new PaletteSelector(runtimeEnabled);
    const result = selector.select({ overrideId: 'math_rigor' });
    expect(result.palette.id).toBe('math_rigor');
  });

  it('selects random palette reproducibly with seed', () => {
    const selector = new PaletteSelector(runtimeEnabled);
    const a = selector.select({ strategy: { type: 'random', seed: 123, allowedIds: ['concise_exec', 'code_planner'] } });
    const b = selector.select({ strategy: { type: 'random', seed: 123, allowedIds: ['concise_exec', 'code_planner'] } });
    expect(a.palette.id).toBe(b.palette.id);
  });

  it('throws when exploration is disabled', () => {
    const selector = new PaletteSelector({ ...runtimeEnabled, allowExploration: false });
    expect(() => selector.select({ strategy: { type: 'random' } })).toThrow();
  });

  it('appends palette text after existing system message', () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'system-header' },
      { role: 'user', content: 'hello' },
    ];
    const selection = new PaletteSelector(runtimeEnabled).select({ overrideId: 'concise_exec' });
    const injected = applyPaletteInjection(selection.palette, messages);
    expect(injected.messages[0].content).toContain('system-header');
    expect(injected.messages[0].content).toContain('--- REASONING PALETTE MODE: concise_exec ---');
  });
});

describe('LLMRouter palette integration', () => {
  class TestProvenance extends PaletteProvenanceRecorder {
    async record(event: any) {
      this.events.push(event);
    }
  }

  class EchoProvider extends MockProvider {
    public lastRequest: any;
    async generate(req: any) {
      this.lastRequest = req;
      return this.createResponse(req, `echo-${req.id}`, { prompt: 1, completion: 1 }, 'mock-model', Date.now());
    }
  }

  const routerConfig = {
    providers: [new EchoProvider()],
    cacheTTL: 0,
    paletteRuntimeConfig: runtimeEnabled,
    paletteProvenanceRecorder: new TestProvenance(),
  };

  it('injects palette prefix and records provenance', async () => {
    const router = new LLMRouter(routerConfig);
    const res = await router.route({
      tenantId: 'tenant-1',
      messages: [
        { role: 'system', content: 'baseline' },
        { role: 'user', content: 'hi' },
      ],
      palette: { overrideId: 'math_rigor' },
    });

    const provider = routerConfig.providers[0] as EchoProvider;
    expect(provider.lastRequest.messages[0].content).toContain('baseline');
    expect(provider.lastRequest.messages[0].content).toContain('--- REASONING PALETTE MODE: math_rigor ---');
    expect(res.paletteUsage?.paletteId).toBe('math_rigor');

    const provenance = routerConfig.paletteProvenanceRecorder as TestProvenance;
    expect(provenance.events.length).toBeGreaterThan(0);
    expect(provenance.events[0].paletteId).toBe('math_rigor');
  });

  it('runs multi-sample palette selection and surfaces candidates', async () => {
    const verifier = {
      async evaluate() {
        return { selectedIndex: 1, scores: [0.1, 0.9] };
      },
    };
    const router = new LLMRouter({ ...routerConfig, paletteVerifier: verifier });
    const res = await router.route({
      messages: [{ role: 'user', content: 'hi' }],
      palette: { strategy: { type: 'random', seed: 42 }, k: 2, seed: 99 },
    });

    expect(res.selectedCandidateIndex).toBe(1);
    expect(res.paletteCandidates?.length).toBe(2);
    expect(res.paletteVerifierScores).toEqual([0.1, 0.9]);
  });
});
