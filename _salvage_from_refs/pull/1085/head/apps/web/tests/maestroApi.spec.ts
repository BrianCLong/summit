// =============================================
// File: apps/web/tests/maestroApi.spec.ts
// =============================================
import { describe, expect, it } from 'vitest';
import { MaestroApi } from '../lib/maestroApi';

describe('MaestroApi (mock)', () => {
  const api = new MaestroApi({ mock: true });
  it('routePreview returns candidates', async () => {
    const res = await api.routePreview('test');
    expect(res.candidates.length).toBeGreaterThan(0);
  });
  it('orchestrateWeb returns synthesized text', async () => {
    const res = await api.orchestrateWeb('task', ['web-serp']);
    expect(res.synthesized.text).toContain('task');
  });
});
