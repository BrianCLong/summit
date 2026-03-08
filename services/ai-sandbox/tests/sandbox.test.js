"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const SandboxRuntime_js_1 = require("../src/sandbox/SandboxRuntime.js");
(0, globals_1.describe)('SandboxRuntime', () => {
    let runtime;
    const defaultQuotas = {
        cpuMs: 5000,
        memoryMb: 256,
        timeoutMs: 10000,
        maxOutputBytes: 65536,
        networkEnabled: false,
        storageEnabled: false,
    };
    (0, globals_1.beforeEach)(() => {
        runtime = new SandboxRuntime_js_1.SandboxRuntime(defaultQuotas);
    });
    (0, globals_1.describe)('execute', () => {
        (0, globals_1.it)('should execute simple code successfully', async () => {
            const code = 'return { result: input.value * 2 };';
            const result = await runtime.execute(code, { value: 21 });
            (0, globals_1.expect)(result.status).toBe('completed');
            (0, globals_1.expect)(result.output).toEqual({ result: 42 });
            (0, globals_1.expect)(result.error).toBeUndefined();
        });
        (0, globals_1.it)('should capture console logs', async () => {
            const code = `
        console.log('test message');
        console.warn('warning');
        return 'done';
      `;
            const result = await runtime.execute(code, {});
            (0, globals_1.expect)(result.status).toBe('completed');
            (0, globals_1.expect)(result.logs).toContain('[LOG] test message');
            (0, globals_1.expect)(result.logs).toContain('[WARN] warning');
        });
        (0, globals_1.it)('should block require statements', async () => {
            const code = "const fs = require('fs'); return fs;";
            const result = await runtime.execute(code, {});
            (0, globals_1.expect)(result.status).toBe('failed');
            (0, globals_1.expect)(result.error).toContain('Security violation');
            (0, globals_1.expect)(result.error).toContain('require');
        });
        (0, globals_1.it)('should block import statements', async () => {
            const code = "import fs from 'fs'; return fs;";
            const result = await runtime.execute(code, {});
            (0, globals_1.expect)(result.status).toBe('failed');
            (0, globals_1.expect)(result.error).toContain('Security violation');
        });
        (0, globals_1.it)('should block process access', async () => {
            const code = 'return process.env;';
            const result = await runtime.execute(code, {});
            (0, globals_1.expect)(result.status).toBe('failed');
            (0, globals_1.expect)(result.error).toContain('Security violation');
        });
        (0, globals_1.it)('should block eval', async () => {
            const code = "return eval('1+1');";
            const result = await runtime.execute(code, {});
            (0, globals_1.expect)(result.status).toBe('failed');
            (0, globals_1.expect)(result.error).toContain('Security violation');
        });
        (0, globals_1.it)('should allow Math operations', async () => {
            const code = 'return Math.max(input.a, input.b);';
            const result = await runtime.execute(code, { a: 10, b: 20 });
            (0, globals_1.expect)(result.status).toBe('completed');
            (0, globals_1.expect)(result.output).toBe(20);
        });
        (0, globals_1.it)('should allow Date operations', async () => {
            const code = 'return new Date().getFullYear();';
            const result = await runtime.execute(code, {});
            (0, globals_1.expect)(result.status).toBe('completed');
            (0, globals_1.expect)(result.output).toBeGreaterThanOrEqual(2024);
        });
        (0, globals_1.it)('should allow JSON operations', async () => {
            const code = 'return JSON.parse(JSON.stringify(input));';
            const result = await runtime.execute(code, { foo: 'bar' });
            (0, globals_1.expect)(result.status).toBe('completed');
            (0, globals_1.expect)(result.output).toEqual({ foo: 'bar' });
        });
        (0, globals_1.it)('should track resource usage', async () => {
            const code = 'return input;';
            const result = await runtime.execute(code, { test: true });
            (0, globals_1.expect)(result.resourceUsage).toBeDefined();
            (0, globals_1.expect)(result.resourceUsage.cpuMs).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(result.resourceUsage.durationMs).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(result.resourceUsage.outputBytes).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should fail on output size exceeded', async () => {
            const smallQuotas = { ...defaultQuotas, maxOutputBytes: 10 };
            const smallRuntime = new SandboxRuntime_js_1.SandboxRuntime(smallQuotas);
            const code = 'return { largeData: "a".repeat(100) };';
            const result = await smallRuntime.execute(code, {});
            (0, globals_1.expect)(result.status).toBe('failed');
            (0, globals_1.expect)(result.error).toContain('Output size');
        });
        (0, globals_1.it)('should timeout on long-running code', async () => {
            const shortQuotas = { ...defaultQuotas, cpuMs: 50, timeoutMs: 100 };
            const shortRuntime = new SandboxRuntime_js_1.SandboxRuntime(shortQuotas);
            const code = 'while(true) {}; return "done";';
            const result = await shortRuntime.execute(code, {});
            (0, globals_1.expect)(result.status).toBe('timeout');
        });
        (0, globals_1.it)('should handle async code', async () => {
            const code = `
        const delay = (ms) => new Promise(r => setTimeout(r, ms));
        await delay(10);
        return 'async done';
      `;
            const result = await runtime.execute(code, {});
            (0, globals_1.expect)(result.status).toBe('completed');
            (0, globals_1.expect)(result.output).toBe('async done');
        });
        (0, globals_1.it)('should handle syntax errors gracefully', async () => {
            const code = 'return {{{ invalid';
            const result = await runtime.execute(code, {});
            (0, globals_1.expect)(result.status).toBe('failed');
            (0, globals_1.expect)(result.error).toBeDefined();
        });
        (0, globals_1.it)('should handle runtime errors gracefully', async () => {
            const code = 'throw new Error("test error");';
            const result = await runtime.execute(code, {});
            (0, globals_1.expect)(result.status).toBe('failed');
            (0, globals_1.expect)(result.error).toContain('test error');
        });
    });
});
