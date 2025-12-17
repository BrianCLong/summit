import { describe, it, expect, beforeEach } from '@jest/globals';
import { SandboxRuntime } from '../src/sandbox/SandboxRuntime.js';
import type { ResourceQuotas } from '../src/types.js';

describe('SandboxRuntime', () => {
  let runtime: SandboxRuntime;
  const defaultQuotas: ResourceQuotas = {
    cpuMs: 5000,
    memoryMb: 256,
    timeoutMs: 10000,
    maxOutputBytes: 65536,
    networkEnabled: false,
    storageEnabled: false,
  };

  beforeEach(() => {
    runtime = new SandboxRuntime(defaultQuotas);
  });

  describe('execute', () => {
    it('should execute simple code successfully', async () => {
      const code = 'return { result: input.value * 2 };';
      const result = await runtime.execute(code, { value: 21 });

      expect(result.status).toBe('completed');
      expect(result.output).toEqual({ result: 42 });
      expect(result.error).toBeUndefined();
    });

    it('should capture console logs', async () => {
      const code = `
        console.log('test message');
        console.warn('warning');
        return 'done';
      `;
      const result = await runtime.execute(code, {});

      expect(result.status).toBe('completed');
      expect(result.logs).toContain('[LOG] test message');
      expect(result.logs).toContain('[WARN] warning');
    });

    it('should block require statements', async () => {
      const code = "const fs = require('fs'); return fs;";
      const result = await runtime.execute(code, {});

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Security violation');
      expect(result.error).toContain('require');
    });

    it('should block import statements', async () => {
      const code = "import fs from 'fs'; return fs;";
      const result = await runtime.execute(code, {});

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Security violation');
    });

    it('should block process access', async () => {
      const code = 'return process.env;';
      const result = await runtime.execute(code, {});

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Security violation');
    });

    it('should block eval', async () => {
      const code = "return eval('1+1');";
      const result = await runtime.execute(code, {});

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Security violation');
    });

    it('should allow Math operations', async () => {
      const code = 'return Math.max(input.a, input.b);';
      const result = await runtime.execute(code, { a: 10, b: 20 });

      expect(result.status).toBe('completed');
      expect(result.output).toBe(20);
    });

    it('should allow Date operations', async () => {
      const code = 'return new Date().getFullYear();';
      const result = await runtime.execute(code, {});

      expect(result.status).toBe('completed');
      expect(result.output).toBeGreaterThanOrEqual(2024);
    });

    it('should allow JSON operations', async () => {
      const code = 'return JSON.parse(JSON.stringify(input));';
      const result = await runtime.execute(code, { foo: 'bar' });

      expect(result.status).toBe('completed');
      expect(result.output).toEqual({ foo: 'bar' });
    });

    it('should track resource usage', async () => {
      const code = 'return input;';
      const result = await runtime.execute(code, { test: true });

      expect(result.resourceUsage).toBeDefined();
      expect(result.resourceUsage.cpuMs).toBeGreaterThanOrEqual(0);
      expect(result.resourceUsage.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.resourceUsage.outputBytes).toBeGreaterThan(0);
    });

    it('should fail on output size exceeded', async () => {
      const smallQuotas: ResourceQuotas = { ...defaultQuotas, maxOutputBytes: 10 };
      const smallRuntime = new SandboxRuntime(smallQuotas);

      const code = 'return { largeData: "a".repeat(100) };';
      const result = await smallRuntime.execute(code, {});

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Output size');
    });

    it('should timeout on long-running code', async () => {
      const shortQuotas: ResourceQuotas = { ...defaultQuotas, cpuMs: 50, timeoutMs: 100 };
      const shortRuntime = new SandboxRuntime(shortQuotas);

      const code = 'while(true) {}; return "done";';
      const result = await shortRuntime.execute(code, {});

      expect(result.status).toBe('timeout');
    });

    it('should handle async code', async () => {
      const code = `
        const delay = (ms) => new Promise(r => setTimeout(r, ms));
        await delay(10);
        return 'async done';
      `;
      const result = await runtime.execute(code, {});

      expect(result.status).toBe('completed');
      expect(result.output).toBe('async done');
    });

    it('should handle syntax errors gracefully', async () => {
      const code = 'return {{{ invalid';
      const result = await runtime.execute(code, {});

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    });

    it('should handle runtime errors gracefully', async () => {
      const code = 'throw new Error("test error");';
      const result = await runtime.execute(code, {});

      expect(result.status).toBe('failed');
      expect(result.error).toContain('test error');
    });
  });
});
