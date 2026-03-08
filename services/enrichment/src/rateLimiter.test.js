"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rateLimiter_js_1 = require("./rateLimiter.js");
test('token bucket enforces capacity', () => {
    const bucket = new rateLimiter_js_1.TokenBucket(1, 0);
    expect(bucket.take()).toBe(true);
    expect(bucket.take()).toBe(false);
});
test('token bucket refills over time', async () => {
    const bucket = new rateLimiter_js_1.TokenBucket(1, 1);
    expect(bucket.take()).toBe(true);
    expect(bucket.take()).toBe(false);
    await new Promise((r) => setTimeout(r, 1100));
    expect(bucket.take()).toBe(true);
});
