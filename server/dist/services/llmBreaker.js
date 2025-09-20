import CircuitBreaker from 'opossum';
export function wrapStream(fn) {
    const breaker = new CircuitBreaker(async function* (...args) {
        for await (const t of fn(...args))
            yield t;
    }, { errorThresholdPercentage: 50, resetTimeout: 5000, rollingCountTimeout: 10000 });
    return breaker;
}
//# sourceMappingURL=llmBreaker.js.map