"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMRouter = void 0;
const cache_js_1 = require("./cache.js");
const replay_js_1 = require("./replay.js");
const errors_js_1 = require("./errors.js");
const crypto_1 = require("crypto");
const selector_js_1 = require("./palette/selector.js");
const injection_js_1 = require("./palette/injection.js");
const registry_js_1 = require("./palette/registry.js");
const metrics_js_1 = require("./palette/metrics.js");
const provenance_js_1 = require("./palette/provenance.js");
const metrics_js_2 = require("../../monitoring/metrics.js");
class LLMRouter {
    providers = new Map();
    policies = [];
    guardrails = [];
    cache;
    replayLog;
    paletteSelector;
    paletteRuntime;
    paletteProvenance;
    paletteVerifier;
    constructor(config) {
        config.providers.forEach(p => this.providers.set(p.name, p));
        this.policies = config.policies || [];
        this.guardrails = config.guardrails || [];
        this.cache = new cache_js_1.LLMCache(config.cacheTTL);
        this.replayLog = new replay_js_1.ReplayLog(config.logDir);
        this.paletteRuntime = config.paletteRuntimeConfig || (0, registry_js_1.resolvePaletteRuntimeConfig)();
        this.paletteSelector = new selector_js_1.PaletteSelector(this.paletteRuntime);
        this.paletteVerifier = config.paletteVerifier;
        this.paletteProvenance = config.paletteProvenanceRecorder || new provenance_js_1.PaletteProvenanceRecorder();
    }
    async route(request) {
        const baseRequest = {
            id: request.id || (0, crypto_1.randomUUID)(),
            messages: request.messages || [],
            ...request,
        };
        const baseMessages = baseRequest.messages || [];
        const paletteOptions = baseRequest.palette;
        const paletteEnabled = this.paletteRuntime.enabled || !!paletteOptions;
        const paletteContext = { tenantId: baseRequest.tenantId };
        if (paletteOptions && !this.paletteRuntime.enabled) {
            throw new errors_js_1.RoutingError('Reasoning palettes requested but feature flag is disabled');
        }
        const k = paletteEnabled ? Math.min(Math.max(paletteOptions?.k ?? 1, 1), this.paletteRuntime.maxK) : 1;
        const selectionStart = Date.now();
        const runGuardrailsOnRequest = async (req) => {
            let next = req;
            for (const guard of this.guardrails) {
                next = await guard.validateRequest(next);
            }
            return next;
        };
        const runGuardrailsOnResponse = async (resp) => {
            let next = resp;
            for (const guard of this.guardrails) {
                next = await guard.validateResponse(next);
            }
            return next;
        };
        const executeWithProviders = async (req) => {
            let candidates = Array.from(this.providers.values());
            if (req.model) {
                candidates = candidates.filter((p) => p.supports(req.model));
            }
            else if (req.tags && req.tags.length > 0) {
                candidates = candidates.filter((p) => {
                    return p.getCapabilities().some((cap) => req.tags.every((tag) => cap.tags.includes(tag)));
                });
            }
            if (candidates.length === 0) {
                throw new errors_js_1.RoutingError('No providers available for this request');
            }
            for (const policy of this.policies) {
                candidates = await policy.sortProviders(candidates, req);
            }
            if (candidates.length === 0) {
                throw new errors_js_1.RoutingError('All providers filtered out by policies');
            }
            let lastError = null;
            for (const provider of candidates) {
                const start = Date.now();
                try {
                    const response = await provider.generate(req);
                    const duration = (Date.now() - start) / 1000;
                    metrics_js_2.llmRequestsTotal.inc({
                        provider: provider.name,
                        model: req.model || 'unknown',
                        status: 'success'
                    });
                    metrics_js_2.llmRequestDuration.observe({
                        provider: provider.name,
                        model: req.model || 'unknown',
                        status: 'success'
                    }, duration);
                    return response;
                }
                catch (error) {
                    const duration = (Date.now() - start) / 1000;
                    metrics_js_2.llmRequestsTotal.inc({
                        provider: provider.name,
                        model: req.model || 'unknown',
                        status: 'error'
                    });
                    metrics_js_2.llmRequestDuration.observe({
                        provider: provider.name,
                        model: req.model || 'unknown',
                        status: 'error'
                    }, duration);
                    console.error(`Provider ${provider.name} failed:`, error);
                    lastError = error instanceof errors_js_1.ProviderError ? error : new errors_js_1.ProviderError(provider.name, error.message, error);
                }
            }
            throw new errors_js_1.RoutingError(`All providers failed. Last error: ${lastError?.message}`);
        };
        const applyPalette = (selection, requestIdSuffix) => {
            if (!selection)
                return { ...baseRequest, messages: baseMessages, id: requestIdSuffix ? `${baseRequest.id}-${requestIdSuffix}` : baseRequest.id };
            const injection = (0, injection_js_1.applyPaletteInjection)(selection.palette, baseMessages);
            metrics_js_1.paletteUsedTotal.inc({ paletteId: selection.palette.id });
            const updated = {
                ...baseRequest,
                id: requestIdSuffix ? `${baseRequest.id}-${requestIdSuffix}` : baseRequest.id,
                messages: injection.messages,
            };
            if (selection.decodingApplied?.temperature !== undefined && updated.temperature === undefined) {
                updated.temperature = selection.decodingApplied.temperature;
            }
            if (selection.decodingApplied?.topP !== undefined && updated.topP === undefined) {
                updated.topP = selection.decodingApplied.topP;
            }
            return updated;
        };
        if (k > 1 && paletteEnabled) {
            metrics_js_1.paletteCandidateHistogram.observe(k);
            const selections = [];
            for (let i = 0; i < k; i++) {
                const selection = this.paletteSelector.select({ ...paletteOptions, seed: (paletteOptions?.seed ?? Date.now()) + i }, paletteContext);
                selections.push(selection);
            }
            metrics_js_1.paletteSelectionLatency.observe(Date.now() - selectionStart);
            const candidates = [];
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
                }
                catch (err) {
                    candidates.push({ palette: selection.palette, error: err });
                }
            }
            const successful = candidates.filter((c) => c.response);
            if (!successful.length) {
                throw new errors_js_1.RoutingError('All palette candidates failed');
            }
            let selectedIndex = 0;
            let scores = candidates.map(() => null);
            if (this.paletteVerifier) {
                try {
                    const result = await this.paletteVerifier.evaluate(candidates);
                    selectedIndex = Math.min(Math.max(result.selectedIndex, 0), candidates.length - 1);
                    scores = result.scores;
                }
                catch (err) {
                    console.warn('Palette verifier failed, defaulting to first candidate', err);
                }
            }
            const selectedCandidate = candidates[selectedIndex].response || successful[0].response;
            selectedCandidate.paletteCandidates = candidates;
            selectedCandidate.selectedCandidateIndex = selectedIndex;
            selectedCandidate.paletteVerifierScores = scores;
            await this.paletteProvenance.record({
                paletteId: selectedCandidate.paletteUsage?.paletteId || selections[0].palette.id,
                strategy: selections[selectedIndex]?.strategyUsed,
                injectionKind: selections[selectedIndex]?.injectionKind || 'text_prefix',
                decoding: selections[selectedIndex]?.decodingApplied,
                candidates: (0, provenance_js_1.buildCandidateEvidence)(candidates),
                selectedIndex,
                tenantId: baseRequest.tenantId,
                requestId: baseRequest.id,
            });
            const replaySafe = { ...selectedCandidate, paletteCandidates: undefined };
            await this.replayLog.log(baseRequest, replaySafe);
            return selectedCandidate;
        }
        const paletteSelection = paletteEnabled
            ? this.paletteSelector.select(paletteOptions || { strategy: undefined }, paletteContext)
            : null;
        if (paletteSelection) {
            metrics_js_1.paletteSelectionLatency.observe(Date.now() - selectionStart);
        }
        let fullRequest = applyPalette(paletteSelection, undefined);
        try {
            fullRequest = await runGuardrailsOnRequest(fullRequest);
        }
        catch (err) {
            throw new errors_js_1.SafetyViolationError('Pre-processing', err.message);
        }
        const cacheKey = this.cache.generateKey({ ...fullRequest, palette: paletteSelection?.palette.id });
        const cachedResponse = this.cache.get(cacheKey);
        if (cachedResponse) {
            await this.replayLog.log(fullRequest, cachedResponse);
            return cachedResponse;
        }
        let finalResponse = null;
        let lastError = null;
        try {
            finalResponse = await executeWithProviders(fullRequest);
        }
        catch (err) {
            lastError = err;
        }
        if (!finalResponse) {
            const failureResponse = {
                id: (0, crypto_1.randomUUID)(),
                requestId: fullRequest.id,
                provider: 'mock',
                model: 'error',
                text: '',
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                latencyMs: 0,
                cached: false,
            };
            await this.replayLog.log(fullRequest, failureResponse, lastError);
            throw new errors_js_1.RoutingError(`All providers failed. Last error: ${lastError?.message}`);
        }
        try {
            finalResponse = await runGuardrailsOnResponse(finalResponse);
        }
        catch (err) {
            throw new errors_js_1.SafetyViolationError('Post-processing', err.message);
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
    registerProvider(provider) {
        this.providers.set(provider.name, provider);
    }
}
exports.LLMRouter = LLMRouter;
