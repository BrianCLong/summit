import fs from 'fs';
import path from 'path';
import { GraniteDoclingClient } from '../src/granite-client';

// Ensure heuristic mode
delete process.env.GRANITE_DOCLING_ENDPOINT;

describe('GraniteDoclingClient heuristics', () => {
  const client = new GraniteDoclingClient();

  it('synthesizes fragments when no endpoint configured', async () => {
    const log = fs.readFileSync(
      path.join(__dirname, 'fixtures/sample-build-log.txt'),
      'utf8',
    );
    const response = await client.parse({
      requestId: 'heuristic-1',
      tenantId: 'tenant-h',
      purpose: 'investigation',
      retention: 'short',
      contentType: 'text/plain',
      bytes: Buffer.from(log).toString('base64'),
    });

    expect(response.result.fragments.length).toBeGreaterThan(0);
    expect(response.usage.characters).toBeGreaterThan(0);
  });

  it('creates focused failure summary', async () => {
    const log = fs.readFileSync(
      path.join(__dirname, 'fixtures/sample-build-log.txt'),
      'utf8',
    );
    const response = await client.summarize({
      requestId: 'heuristic-2',
      tenantId: 'tenant-h',
      purpose: 'investigation',
      retention: 'short',
      text: log,
      focus: 'failures',
    });

    expect(response.result.text).toContain('Failure summary');
    expect(response.result.highlights.length).toBeGreaterThan(0);
  });
});
