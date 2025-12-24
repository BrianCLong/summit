
import { SafeClient } from '../SafeClient';

describe('SafeClient', () => {
    it('should respect rate limits', async () => {
        const client = new SafeClient({
            rateLimit: { maxRequests: 2, windowMs: 1000 }
        });

        await client.request('http://test.com');
        await client.request('http://test.com');

        await expect(client.request('http://test.com')).rejects.toThrow('RateLimit Exceeded');
    });

    it('should trip circuit breaker on failures', async () => {
        const client = new SafeClient({
            circuitBreaker: { failureThreshold: 2, resetTimeoutMs: 100 }
        });

        const fail = () => { throw new Error('Net Error'); };

        // Fail 1
        await expect(client.request('http://t', { mockFn: fail })).rejects.toThrow('Net Error');
        // Fail 2 -> Trip
        await expect(client.request('http://t', { mockFn: fail })).rejects.toThrow('Net Error');

        // Next should be blocked by breaker
        await expect(client.request('http://t', { mockFn: fail })).rejects.toThrow('CircuitBreaker is OPEN');
    });

    it('should recover circuit breaker', async () => {
        const client = new SafeClient({
            circuitBreaker: { failureThreshold: 1, resetTimeoutMs: 50 }
        });
        const fail = () => { throw new Error('Err'); };

        await expect(client.request('u', { mockFn: fail })).rejects.toThrow();
        await expect(client.request('u')).rejects.toThrow('CircuitBreaker is OPEN');

        // Wait
        await new Promise(r => setTimeout(r, 60));

        // Should be HALF_OPEN -> success closes it
        await expect(client.request('u')).resolves.toEqual({ status: 200, data: 'ok' });
    });
});
