"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
function buildKey(seed) {
    return {
        modelHash: `model:${seed}`,
        tokenizerHash: `tokenizer:${seed}`,
        params: { temperature: 0.2, max_tokens: 64, seed },
        toolsGraphHash: `tools:${seed}`,
        promptHash: `prompt:${seed}`
    };
}
(0, vitest_1.describe)('DeterministicPromptExecutionCache core', () => {
    (0, vitest_1.it)('returns deterministic hits with attestable proofs', async () => {
        let now = 0;
        const cache = new index_js_1.DeterministicPromptExecutionCache({
            maxEntries: 4,
            clock: () => {
                now += 1000;
                return now;
            }
        });
        const key = buildKey('alpha');
        const fetcher = vitest_1.vi.fn(async () => ({ artifact: 'artifact-alpha' }));
        const miss = await cache.resolve(key, fetcher);
        (0, vitest_1.expect)(miss.type).toBe('miss');
        (0, vitest_1.expect)(fetcher).toHaveBeenCalledTimes(1);
        const hit = await cache.resolve(key, fetcher);
        (0, vitest_1.expect)(hit.type).toBe('hit');
        (0, vitest_1.expect)(fetcher).toHaveBeenCalledTimes(1);
        const manifest = cache.generateManifest();
        (0, vitest_1.expect)(manifest.entries).toHaveLength(1);
        (0, vitest_1.expect)(index_js_1.DeterministicPromptExecutionCache.verifyManifest(manifest)).toBe(true);
        (0, vitest_1.expect)(index_js_1.DeterministicPromptExecutionCache.verifyHitProof(hit.proof, manifest)).toBe(true);
        (0, vitest_1.expect)(Buffer.compare(miss.artifact, hit.artifact)).toBe(0);
    });
    (0, vitest_1.it)('produces verifiable eviction proofs and manifests', async () => {
        let now = 0;
        const cache = new index_js_1.DeterministicPromptExecutionCache({
            maxEntries: 2,
            clock: () => {
                now += 1000;
                return now;
            }
        });
        const missA = await cache.resolve(buildKey('a'), async () => ({ artifact: 'A' }));
        (0, vitest_1.expect)(missA.type).toBe('miss');
        const missB = await cache.resolve(buildKey('b'), async () => ({ artifact: 'B' }));
        (0, vitest_1.expect)(missB.evictionProofs).toHaveLength(0);
        const missC = await cache.resolve(buildKey('c'), async () => ({ artifact: 'C' }));
        (0, vitest_1.expect)(missC.evictionProofs.length).toBe(1);
        (0, vitest_1.expect)(index_js_1.DeterministicPromptExecutionCache.verifyEvictionProof(missC.evictionProofs[0])).toBe(true);
        const manifest = cache.generateManifest();
        (0, vitest_1.expect)(index_js_1.DeterministicPromptExecutionCache.verifyManifest(manifest)).toBe(true);
        (0, vitest_1.expect)(manifest.entries.map((e) => e.key).sort()).toEqual([
            missB.entry.key,
            missC.entry.key
        ].sort());
    });
    (0, vitest_1.it)('replays miss-fill traces to yield byte-identical artifacts', async () => {
        let now = 0;
        const cache = new index_js_1.DeterministicPromptExecutionCache({
            maxEntries: 3,
            clock: () => {
                now += 1000;
                return now;
            }
        });
        const miss = await cache.resolve(buildKey('trace'), async () => ({ artifact: 'TRACE-VALUE' }));
        (0, vitest_1.expect)(miss.type).toBe('miss');
        const ok = await index_js_1.DeterministicPromptExecutionCache.replayTrace(miss.trace, async () => ({
            artifact: 'TRACE-VALUE'
        }));
        (0, vitest_1.expect)(ok).toBe(true);
        const bad = await index_js_1.DeterministicPromptExecutionCache.replayTrace(miss.trace, async () => ({
            artifact: 'DIFFERENT'
        }));
        (0, vitest_1.expect)(bad).toBe(false);
    });
    (0, vitest_1.it)('verifies miss-fill traces and detects tampering attempts', async () => {
        let now = 0;
        const cache = new index_js_1.DeterministicPromptExecutionCache({
            maxEntries: 3,
            clock: () => {
                now += 1000;
                return now;
            }
        });
        const miss = await cache.resolve(buildKey('trace-verify'), async () => ({
            artifact: { nested: true, value: 42 }
        }));
        (0, vitest_1.expect)(index_js_1.DeterministicPromptExecutionCache.verifyMissFillTrace(miss.trace)).toBe(true);
        const tampered = {
            ...miss.trace,
            artifactBase64: Buffer.from('tampered').toString('base64')
        };
        (0, vitest_1.expect)(index_js_1.DeterministicPromptExecutionCache.verifyMissFillTrace(tampered)).toBe(false);
    });
    (0, vitest_1.it)('records audit logs for hits, misses, and evictions with defensive copies', async () => {
        let now = 0;
        const cache = new index_js_1.DeterministicPromptExecutionCache({
            maxEntries: 1,
            clock: () => {
                now += 1000;
                return now;
            }
        });
        const missA = await cache.resolve(buildKey('audit-a'), async () => ({ artifact: 'A' }));
        (0, vitest_1.expect)(missA.type).toBe('miss');
        const hitA = await cache.resolve(buildKey('audit-a'), async () => ({ artifact: 'A' }));
        (0, vitest_1.expect)(hitA.type).toBe('hit');
        const missB = await cache.resolve(buildKey('audit-b'), async () => ({ artifact: 'B' }));
        (0, vitest_1.expect)(missB.evictionProofs.length).toBe(1);
        const logSnapshot = cache.getAuditLog();
        (0, vitest_1.expect)(logSnapshot.misses).toHaveLength(2);
        (0, vitest_1.expect)(logSnapshot.hits).toHaveLength(1);
        (0, vitest_1.expect)(logSnapshot.evictions).toHaveLength(1);
        // mutate snapshot and ensure internal state remains intact
        logSnapshot.hits[0].key = 'mutated-key';
        logSnapshot.evictions[0].survivors[0].accessCounter = -1;
        const secondSnapshot = cache.getAuditLog();
        (0, vitest_1.expect)(secondSnapshot.hits[0].key).not.toBe('mutated-key');
        (0, vitest_1.expect)(secondSnapshot.evictions[0].survivors[0].accessCounter).toBeGreaterThan(0);
    });
});
(0, vitest_1.describe)('Adapters', () => {
    (0, vitest_1.it)('wraps OpenAI chat completions with deterministic caching', async () => {
        let now = 0;
        const cache = new index_js_1.DeterministicPromptExecutionCache({
            maxEntries: 4,
            clock: () => {
                now += 1000;
                return now;
            }
        });
        const create = vitest_1.vi.fn(async () => ({
            id: 'chatcmpl-1',
            created: 1,
            model: 'gpt-test',
            choices: [
                {
                    index: 0,
                    message: { role: 'assistant', content: 'hello' },
                    finish_reason: 'stop'
                }
            ]
        }));
        const client = {
            chat: {
                completions: {
                    create
                }
            }
        };
        const adapter = (0, index_js_1.createOpenAIChatAdapter)({ client, cache });
        const request = {
            model: 'gpt-test',
            messages: [
                { role: 'system', content: 'be terse' },
                { role: 'user', content: 'hi' }
            ],
            temperature: 0,
            max_tokens: 16
        };
        const miss = await adapter(request);
        (0, vitest_1.expect)(miss.hit).toBe(false);
        (0, vitest_1.expect)(create).toHaveBeenCalledTimes(1);
        const hit = await adapter(request);
        (0, vitest_1.expect)(hit.hit).toBe(true);
        (0, vitest_1.expect)(create).toHaveBeenCalledTimes(1);
        const manifest = cache.generateManifest();
        (0, vitest_1.expect)(index_js_1.DeterministicPromptExecutionCache.verifyManifest(manifest)).toBe(true);
        (0, vitest_1.expect)(hit.proof).toBeDefined();
        (0, vitest_1.expect)(hit.proof && index_js_1.DeterministicPromptExecutionCache.verifyHitProof(hit.proof, manifest)).toBe(true);
    });
    (0, vitest_1.it)('wraps Anthropic messages with deterministic caching', async () => {
        let now = 0;
        const cache = new index_js_1.DeterministicPromptExecutionCache({
            maxEntries: 4,
            clock: () => {
                now += 1000;
                return now;
            }
        });
        const create = vitest_1.vi.fn(async () => ({
            id: 'msg-1',
            model: 'claude-test',
            content: [{ type: 'text', text: 'hello' }]
        }));
        const client = {
            messages: {
                create
            }
        };
        const adapter = (0, index_js_1.createAnthropicMessagesAdapter)({ client, cache });
        const request = {
            model: 'claude-test',
            messages: [{ role: 'user', content: 'hi there' }],
            max_tokens: 20,
            top_p: 0.9
        };
        const miss = await adapter(request);
        (0, vitest_1.expect)(miss.hit).toBe(false);
        (0, vitest_1.expect)(create).toHaveBeenCalledTimes(1);
        const hit = await adapter(request);
        (0, vitest_1.expect)(hit.hit).toBe(true);
        (0, vitest_1.expect)(create).toHaveBeenCalledTimes(1);
        const manifest = cache.generateManifest();
        (0, vitest_1.expect)(index_js_1.DeterministicPromptExecutionCache.verifyManifest(manifest)).toBe(true);
        (0, vitest_1.expect)(hit.proof).toBeDefined();
        (0, vitest_1.expect)(hit.proof && index_js_1.DeterministicPromptExecutionCache.verifyHitProof(hit.proof, manifest)).toBe(true);
    });
});
