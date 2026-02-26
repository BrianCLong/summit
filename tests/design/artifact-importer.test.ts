import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  importDesignArtifacts,
  sanitizeHtml,
} from '../../src/agents/design/artifact-importer';

describe('importDesignArtifacts', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'design-import-'));
  });

  afterEach(async () => {
    if (tempRoot) {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('sanitizes script tags from HTML', async () => {
    const source = {
      design: { title: 'Ops Console' },
      screens: [{ id: 'overview', name: 'Overview' }],
      html: {
        'overview.html': '<main><h1>Overview</h1><script>alert(1)</script></main>',
      },
      css: {
        'overview.css': 'main { display: grid; }',
      },
    };

    const result = await importDesignArtifacts({
      designId: 'ops-console',
      evidencePeriod: '202602',
      outputRoot: tempRoot,
      source,
    });

    expect(result.evidenceId).toMatch(/^SUMMIT-DESIGN-202602-[A-F0-9]{12}$/);

    const htmlPath = path.join(tempRoot, 'artifacts', 'ui-design', 'ops-console', 'html', 'overview.html');
    const htmlContent = await fs.readFile(htmlPath, 'utf8');

    expect(htmlContent).not.toContain('<script');
    expect(htmlContent).toContain('<h1>Overview</h1>');
  });

  it('denies path traversal in asset file names', async () => {
    await expect(
      importDesignArtifacts({
        designId: 'ops-console',
        evidencePeriod: '202602',
        outputRoot: tempRoot,
        source: {
          design: { title: 'Ops Console' },
          screens: [{ id: 'overview', name: 'Overview' }],
          html: {
            '../escape.html': '<main>bad</main>',
          },
        },
      }),
    ).rejects.toThrow('Invalid asset filename');
  });

  it('produces deterministic artifacts for identical input', async () => {
    const request = {
      designId: 'ops-console',
      evidencePeriod: '202602',
      outputRoot: tempRoot,
      source: {
        design: { title: 'Ops Console', version: 1 },
        screens: [{ id: 'overview', name: 'Overview' }],
        html: {
          'overview.html': '<main><h1>Overview</h1></main>',
        },
        css: {
          'overview.css': 'main { display: grid; }',
        },
      },
    };

    await importDesignArtifacts(request);

    const artifactRoot = path.join(tempRoot, 'artifacts', 'ui-design', 'ops-console');
    const firstReport = await fs.readFile(path.join(artifactRoot, 'report.json'), 'utf8');
    const firstMetrics = await fs.readFile(path.join(artifactRoot, 'metrics.json'), 'utf8');
    const firstStamp = await fs.readFile(path.join(artifactRoot, 'stamp.json'), 'utf8');

    await fs.rm(artifactRoot, { recursive: true, force: true });

    await importDesignArtifacts(request);

    const secondReport = await fs.readFile(path.join(artifactRoot, 'report.json'), 'utf8');
    const secondMetrics = await fs.readFile(path.join(artifactRoot, 'metrics.json'), 'utf8');
    const secondStamp = await fs.readFile(path.join(artifactRoot, 'stamp.json'), 'utf8');

    expect(secondReport).toEqual(firstReport);
    expect(secondMetrics).toEqual(firstMetrics);
    expect(secondStamp).toEqual(firstStamp);
  });

  it('sanitizeHtml strips inline handlers', () => {
    const result = sanitizeHtml('<button onclick="alert(1)">Open</button>');
    expect(result.sanitized).toContain('<button>Open</button>');
  });
});
