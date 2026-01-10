import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import express from 'express';
import request from 'supertest';
import { CaseBundleService } from '../src/cases/bundles/CaseBundleService';
import { FixtureCaseBundleStore } from '../src/cases/bundles/FixtureCaseBundleStore';
import caseBundleRouter from '../src/routes/case-bundles';

describe('CASE_BUNDLE_V1 export/import workflow', () => {
  const createdPaths: string[] = [];
  const service = new CaseBundleService(new FixtureCaseBundleStore());
  const originalFlag = process.env.CASE_BUNDLE_V1;
  const canListen = process.env.NO_NETWORK_LISTEN !== 'true';

  beforeAll(() => {
    process.env.CASE_BUNDLE_V1 = '1';
  });

  afterEach(async () => {
    const toDelete = createdPaths.splice(0, createdPaths.length);
    await Promise.all(
      toDelete.map((p) => fs.rm(p, { recursive: true, force: true }).catch(() => undefined)),
    );
  });

  afterAll(() => {
    process.env.CASE_BUNDLE_V1 = originalFlag;
  });

  it('produces deterministic bundle hashes and ordered manifests', async () => {
    const first = await service.exportCases(['case-alpha', 'case-bravo']);
    const second = await service.exportCases(['case-alpha', 'case-bravo']);
    createdPaths.push(first.bundlePath, second.bundlePath);

    expect(first.manifest.bundleHash).toBe(second.manifest.bundleHash);
    expect(first.manifest.cases.map((c) => c.id)).toEqual(['case-alpha', 'case-bravo']);
    expect(first.manifest.evidence.map((e) => e.id)[0]).toBe('evidence-alpha-1');

    const firstManifest = JSON.parse(
      await fs.readFile(path.join(first.bundlePath, 'manifest.json'), 'utf-8'),
    );
    const secondManifest = JSON.parse(
      await fs.readFile(path.join(second.bundlePath, 'manifest.json'), 'utf-8'),
    );

    expect(firstManifest.cases.map((c: any) => c.id)).toEqual(
      secondManifest.cases.map((c: any) => c.id),
    );
  });

  it('imports bundles with partial restore scopes and writes a mapping report', async () => {
    const exported = await service.exportCases(['case-alpha']);
    createdPaths.push(exported.bundlePath);

    const imported = await service.importBundle(exported.bundlePath, {
      include: { graph: false },
      namespace: 'restored',
      preserveIds: true,
    });

    expect(imported.mapping.mapping.cases[0].newId).toBe('restored:case-alpha');
    expect(imported.mapping.mapping.graphNodes).toHaveLength(0);
    expect(imported.mapping.warnings).toContain('graph import disabled by include flag');

    const mappingFile = await fs.readFile(imported.mappingPath, 'utf-8');
    expect(mappingFile).toContain(imported.mapping.sourceBundleHash);
  });

  it('fails fast on integrity mismatches', async () => {
    const exported = await service.exportCases(['case-alpha']);
    createdPaths.push(exported.bundlePath);

    const notePath = path.join(exported.bundlePath, 'notes', 'note-alpha-1.json');
    await fs.appendFile(notePath, '\ncorrupt');

    await expect(service.importBundle(exported.bundlePath)).rejects.toThrow('integrity_mismatch');
  });

  (canListen ? it : it.skip)('exposes export/import endpoints behind the CASE_BUNDLE_V1 flag', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/case-bundles', caseBundleRouter);

    const exportResponse = await request(app)
      .post('/api/case-bundles/export')
      .send({ caseIds: ['case-alpha'], include: { evidence: false, graph: false, notes: true } });

    createdPaths.push(exportResponse.body.bundlePath);
    expect(exportResponse.status).toBe(200);
    expect(exportResponse.body.manifest.bundleHash).toBeDefined();

    const importResponse = await request(app)
      .post('/api/case-bundles/import')
      .send({
        bundlePath: exportResponse.body.bundlePath,
        include: { evidence: false, graph: false, notes: true },
        namespace: 'api',
      });

    expect(importResponse.status).toBe(200);
    expect(importResponse.body.mapping.skipped).toContain('graph');
  });
});
