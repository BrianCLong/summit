import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMService } from '../LLMService.js';
import { CircuitBreaker } from '../../utils/CircuitBreaker.js';

const { mockCreate } = vi.hoisted(() => {
    return { mockCreate: vi.fn() };
});

vi.mock('openai', () => {
    const OpenAI = vi.fn().mockImplementation(function (this: any) {
        return {
            chat: {
                completions: {
                    create: mockCreate
                }
            }
        };
    });
    return {
        OpenAI,
        default: OpenAI
    };
});

// Mock dependencies
vi.mock('../../utils/logger.js');
vi.mock('../../observability/tracing.js', () => ({
    tracer: {
        trace: (name, fn) => fn({ setAttributes: vi.fn() })
    }
}));
vi.mock('../../observability/metrics.js', () => ({
    metrics: {
        llmTokensTotal: { inc: vi.fn() },
        llmRequestDuration: { observe: vi.fn() }
    }
}));

describe('LLMService Circuit Breaker', () => {
    let llmService: LLMService;

    beforeEach(() => {
        vi.clearAllMocks();
        // Configure service with low threshold for testing
        llmService = new LLMService({
            // Note: In a real test we might want to dependency inject the circuit breaker or its options
            // but here we rely on the internal hardcoded/config-driven instantiation.
            // Since implementation hardcodes failureThreshold to 3 if not provided differently via some other means (it doesn't exposed CB opts in config),
            // we will trust the defaults failureThreshold: 3.
        });
    });

    it('should return fallback when circuit breaker is open', async () => {
        // Fail 3 times to open the circuit (assuming threshold is 3)
        mockCreate.mockRejectedValue(new Error('API Error'));

        // 1st Failure
        try { await llmService.chat([{ role: 'user', content: 'test' }]); } catch (e: any) { console.log('1st Error:', e.message); }
        // 2nd Failure
        try { await llmService.chat([{ role: 'user', content: 'test' }]); } catch (e: any) { console.log('2nd Error:', e.message); }
        // 3rd Failure
        try { await llmService.chat([{ role: 'user', content: 'test' }]); } catch (e: any) { console.log('3rd Error:', e.message); }

        // 4th Call -> Should trigger fallback immediately without calling API
        const result = await llmService.chat([{ role: 'user', content: 'test' }]);

        expect(result).toBe('I am currently experiencing high load or connection issues. Please try again later.');
        // Check call count is 3 (initial failures) not 4
        expect(mockCreate).toHaveBeenCalledTimes(3);
    });
});
