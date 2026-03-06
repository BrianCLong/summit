// @ts-nocheck
import { ProviderAdapter, LLMRequest, RoutingPolicy, LLMResponse, SafetyGuardrail } from './types.js';
import { LLMCache } from './cache.js';
import { ReplayLog } from './replay.js';
import { RoutingError, ProviderError, SafetyViolationError } from './errors.js';
import { randomUUID } from 'crypto';
import { PaletteSelector } from './palette/selector.js';
import { applyPaletteInjection } from './palette/injection.js';
import {
  PaletteCandidateSet,
  PaletteRuntimeConfig,
  PaletteSelectionResult,
  PaletteVerifier,
} from './palette/types.js';
import { resolvePaletteRuntimeConfig } from './palette/registry.js';
import { paletteCandidateHistogram, paletteSelectionLatency, paletteUsedTotal } from './palette/metrics.js';
import { PaletteProvenanceRecorder, buildCandidateEvidence } from './palette/provenance.js';
import { llmRequestsTotal, llmRequestDuration } from '../../monitoring/metrics.js';

export class LLMRouter {
  private providers: Map<string, ProviderAdapter> = new Map();
  private policies: RoutingPolicy[] = [];
  private guardrails: SafetyGuardrail[] = [];
  private cache: LLMCache;
  private replayLog: ReplayLog;
  private paletteSelector: PaletteSelector;
  private paletteRuntime: PaletteRuntimeConfig;
  private paletteProvenance: PaletteProvenanceRecorder;
  private paletteVerifier?: PaletteVerifier;

  constructor(config: {
    providers: ProviderAdapter[];
    policies?: RoutingPolicy[];
    guardrails?: SafetyGuardrail[];
    cacheTTL?: number;
    logDir?: string;
    paletteRuntimeConfig?: PaletteRuntimeConfig;
    paletteVerifier?: PaletteVerifier;
    paletteProvenanceRecorder?: PaletteProvenanceRecorder;
  }) {
    config.providers.forEach(p => this.providers.set(p.name, p));
    this.policies = config.policies || [];
    this.guardrails = config.guardrails || [];
    this.cache = new LLMCache(config.cacheTTL);
    this.replayLog = new ReplayLog(config.logDir);
    this.paletteRuntime = config.paletteRuntimeConfig || resolvePaletteRuntimeConfig();
    this.paletteSelector = new PaletteSelector(this.paletteRuntime);
    this.paletteVerifier = config.paletteVerifier;
    this.paletteProvenance = config.paletteProvenanceRecorder || new PaletteProvenanceRecorder();
  }

  async route(request: Partial<LLMRequest>): Promise<LLMResponse> {
    const baseRequest: LLMRequest = {
      id: request.id || randomUUID(),
      messages: request.messages || [],
      ...request,
    } as LLMRequest;

    const baseMessages = baseRequest.messages || [];
    const paletteOptions = baseRequest.palette;
    const paletteEnabled = this.paletteRuntime.enabled || !!paletteOptions;
    const paletteContext = { tenantId: baseRequest.tenantId };

    if (paletteOptions && !this.paletteRuntime.enabled) {
      throw new RoutingError('Reasoning palettes requested but feature flag is disabled');
    }

    const k = paletteEnabled ? Math.min(Math.max(paletteOptions?.k ?? 1, 1), this.paletteRuntime.maxK) : 1;
    const selectionStart = Date.now();

    const runGuardrailsOnRequest = async (req: LLMRequest) => {
      let next = req;
      for (const guard of this.guardrails) {
        next = await guard.validateRequest(next);
      }
      return next;
    };

    const runGuardrailsOnResponse = async (resp: LLMResponse) => {
      let next = resp;
      for (const guard of this.guardrails) {
        next = await guard.validateResponse(next);
      }
      return next;
    };

    const executeWithProviders = async (req: LLMRequest): Promise<LLMResponse> => {
      let candidates = Array.from(this.providers.values());

      if (req.model) {
        candidates = candidates.filter((p) => p.supports(req.model!));
      } else if (req.tags && req.tags.length > 0) {
        candidates = candidates.filter((p) => {
          return p.getCapabilities().some((cap) => req.tags!.every((tag) => cap.tags.includes(tag)));
        });
      }

      if (candidates.length === 0) {
        throw new RoutingError('No providers available for this request');
      }

      for (const policy of this.policies) {
        candidates = await policy.sortProviders(candidates, req);
      }

      if (candidates.length === 0) {
        throw new RoutingError('All providers filtered out by policies');
      }

      let lastError: Error | null = null;
      for (const provider of candidates) {
        const start = Date.now();
        try {
          const response = await provider.generate(req);
          const duration = (Date.now() - start) / 1000;

          llmRequestsTotal.inc({
            provider: provider.name,
            model: req.model || 'unknown',
            status: 'success'
          });

          llmRequestDuration.observe({
            provider: provider.name,
            model: req.model || 'unknown',
            status: 'success'
          }, duration);

          return response;
        } catch (error: any) {
          const duration = (Date.now() - start) / 1000;

          llmRequestsTotal.inc({
            provider: provider.name,
            model: req.model || 'unknown',
            status: 'error'
          });

          llmRequestDuration.observe({
            provider: provider.name,
            model: req.model || 'unknown',
            status: 'error'
          }, duration);

          console.error(`Provider ${provider.name} failed:`, error);
          lastError = error instanceof ProviderError ? error : new ProviderError(provider.name, error.message, error);
        }
      }

      throw new RoutingError(`All providers failed. Last error: ${lastError?.message}`);
    };

    const applyPalette = (selection: PaletteSelectionResult | null, requestIdSuffix?: string): LLMRequest => {
      if (!selection) return { ...baseRequest, messages: baseMessages, id: requestIdSuffix ? `${baseRequest.id}-${requestIdSuffix}` : baseRequest.id };
      const injection = applyPaletteInjection(selection.palette, baseMessages);
      paletteUsedTotal.inc({ paletteId: selection.palette.id });

      const updated: LLMRequest = {
        ...baseRequest,
        id: requestIdSuffix ? `${baseRequest.id}-${requestIdSuffix}` : baseRequest.id,
        messages: injection.messages,
      };

      if (selection.decodingApplied?.temperature !== undefined && updated.temperature === undefined) {
        updated.temperature = selection.decodingApplied.temperature;
      }
      if ((selection.decodingApplied as any)?.topP !== undefined && (updated as any).topP === undefined) {
        (updated as any).topP = (selection.decodingApplied as any).topP;
      }
      return updated;
    };

    if (k > 1 && paletteEnabled) {
      paletteCandidateHistogram.observe(k);
      const selections: PaletteSelectionResult[] = [];
      for (let i = 0; i < k; i++) {
        const selection = this.paletteSelector.select({ ...paletteOptions, seed: (paletteOptions?.seed ?? Date.now()) + i }, paletteContext);
        selections.push(selection);
      }
      paletteSelectionLatency.observe(Date.now() - selectionStart);

      const candidates: PaletteCandidateSet[] = [];
      for (let i = 0; i < selections.length; i++) {
        const selection = selections[i];
        try {
          let reqWithPalette = applyPalette(selection, `p${i}`);
          reqWithPalette = await runGuardrailsOnRequest(reqWithPalette);
          const resp = await executeWithProviders(reqWithPalette);
          const validated = await runGuardrailsOnResponse(resp);
          validated.paletteUsage = {
            paletteId: selection.palette.id,
            strategy: selection.strategyUsed,
            injectionKind: selection.injectionKind,
            decoding: selection.decodingApplied,
          };
          candidates.push({ palette: selection.palette, response: validated });
        } catch (err: any) {
          candidates.push({ palette: selection.palette, error: err });
        }
      }

      const successful = candidates.filter((c) => c.response);
      if (!successful.length) {
        throw new RoutingError('All palette candidates failed');
      }

      let selectedIndex = 0;
      let scores = candidates.map(() => null as number | null);
      if (this.paletteVerifier) {
        try {
          const result = await this.paletteVerifier.evaluate(candidates);
          selectedIndex = Math.min(Math.max(result.selectedIndex, 0), candidates.length - 1);
          scores = result.scores;
        } catch (err: any) {
          console.warn('Palette verifier failed, defaulting to first candidate', err);
        }
      }

      const selectedCandidate = candidates[selectedIndex].response || successful[0].response!;
      selectedCandidate.paletteCandidates = candidates;
      selectedCandidate.selectedCandidateIndex = selectedIndex;
      selectedCandidate.paletteVerifierScores = scores;

      await this.paletteProvenance.record({
        paletteId: selectedCandidate.paletteUsage?.paletteId || selections[0].palette.id,
        strategy: selections[selectedIndex]?.strategyUsed,
        injectionKind: selections[selectedIndex]?.injectionKind || 'text_prefix',
        decoding: selections[selectedIndex]?.decodingApplied,
        candidates: buildCandidateEvidence(candidates),
        selectedIndex,
        tenantId: baseRequest.tenantId,
        requestId: baseRequest.id,
      });

      const replaySafe = { ...selectedCandidate, paletteCandidates: undefined } as LLMResponse;
      await this.replayLog.log(baseRequest, replaySafe);
      return selectedCandidate;
    }

    const paletteSelection = paletteEnabled
      ? this.paletteSelector.select(paletteOptions || { strategy: undefined }, paletteContext)
      : null;

    if (paletteSelection) {
      paletteSelectionLatency.observe(Date.now() - selectionStart);
    }

    let fullRequest: LLMRequest = applyPalette(paletteSelection, undefined);

    try {
      fullRequest = await runGuardrailsOnRequest(fullRequest);
    } catch (err: any) {
      throw new SafetyViolationError('Pre-processing', err.message);
    }

    const cacheKey = this.cache.generateKey({ ...fullRequest, palette: paletteSelection?.palette.id });
    const cachedResponse = this.cache.get(cacheKey);
    if (cachedResponse) {
      await this.replayLog.log(fullRequest, cachedResponse);
      return cachedResponse;
    }

    let finalResponse: LLMResponse | null = null;
    let lastError: Error | null = null;

    try {
      finalResponse = await executeWithProviders(fullRequest);
    } catch (err: any) {
      lastError = err;
    }

    if (!finalResponse) {
      const failureResponse = {
        id: randomUUID(),
        requestId: fullRequest.id,
        provider: 'mock' as any,
        model: 'error',
        text: '',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        latencyMs: 0,
        cached: false,
      };
      await this.replayLog.log(fullRequest, failureResponse, lastError!);
      throw new RoutingError(`All providers failed. Last error: ${lastError?.message}`);
    }

    try {
      finalResponse = await runGuardrailsOnResponse(finalResponse);
    } catch (err: any) {
      throw new SafetyViolationError('Post-processing', err.message);
    }

    if (paletteSelection) {
      finalResponse.paletteUsage = {
        paletteId: paletteSelection.palette.id,
        strategy: paletteSelection.strategyUsed,
        injectionKind: paletteSelection.injectionKind,
        decoding: paletteSelection.decodingApplied,
      };
      await this.paletteProvenance.record({
        paletteId: paletteSelection.palette.id,
        strategy: paletteSelection.strategyUsed,
        injectionKind: paletteSelection.injectionKind,
        decoding: paletteSelection.decodingApplied,
        candidates: [{ paletteId: paletteSelection.palette.id, responseId: finalResponse.id }],
        selectedIndex: 0,
        tenantId: baseRequest.tenantId,
        requestId: baseRequest.id,
      });
    }

    this.cache.set(cacheKey, finalResponse);
    await this.replayLog.log(fullRequest, finalResponse);

    return finalResponse;
  }

  registerProvider(provider: ProviderAdapter) {
    this.providers.set(provider.name, provider);
  }
}
