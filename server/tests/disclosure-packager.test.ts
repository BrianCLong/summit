/// <reference types="jest" />

import { createHash } from 'crypto';
import { spawnSync } from 'child_process';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { buildDisclosureBundle } from '../src/disclosure/packager';

const CASE_ID = 'case-integration-demo';
const CLAIM_IDS = ['claim-alpha', 'claim-bravo'];
const EXPECTED_PDF_HASH = 'c6bb88f56a678434b01dbd4f7bc415232cb5dfbff663c8628b6d2fd7130244cc';

function sha(buffer: Buffer | string): string {
  return createHash('sha256').update(buffer).digest('hex');
}

async function createAttachmentFixture(filename: string, content: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'disclosure-')); 
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
}

describe('disclosure packager', () => {
  let attachmentPaths: string[];
  let initialResult: Awaited<ReturnType<typeof buildDisclosureBundle>>;

  beforeAll(async () => {
    const first = await createAttachmentFixture('evidence-alpha.txt', 'Attachment alpha evidence for deterministic bundle.');
    const second = await createAttachmentFixture('evidence-bravo.txt', 'Attachment bravo evidence with additional context.');
    attachmentPaths = [first, second];

    initialResult = await buildDisclosureBundle({
      caseId: CASE_ID,
      claimIds: CLAIM_IDS,
      attachments: [
        { path: attachmentPaths[0], name: 'Alpha Exhibit.txt', license: 'CC-BY-4.0' },
        { path: attachmentPaths[1], name: 'Bravo Exhibit.txt', license: 'CC-BY-4.0' },
      ],
      generationTimestamp: '2024-01-05T00:00:00.000Z',
    });
  });

  test('produces byte-stable bundle for identical inputs', async () => {
    const repeat = await buildDisclosureBundle({
      caseId: CASE_ID,
      claimIds: CLAIM_IDS,
      attachments: [
        { path: attachmentPaths[0], name: 'Alpha Exhibit.txt', license: 'CC-BY-4.0' },
        { path: attachmentPaths[1], name: 'Bravo Exhibit.txt', license: 'CC-BY-4.0' },
      ],
      generationTimestamp: '2024-01-05T00:00:00.000Z',
    });

    const firstZip = await fs.readFile(initialResult.bundlePath);
    const repeatZip = await fs.readFile(repeat.bundlePath);

    expect(firstZip.equals(repeatZip)).toBe(true);
    expect(initialResult.bundleSha256).toBe(repeat.bundleSha256);
  });

  test('external verifier script validates manifest hashes', () => {
    const verifyScript = path.resolve(process.cwd(), '..', 'tools', 'verify-bundle.py');
    const verify = spawnSync(
      'python3',
      [
        verifyScript,
        '--manifest',
        initialResult.manifestPath,
        '--evidence-dir',
        path.join(initialResult.workDir, 'exhibits'),
        '--skip-policy',
      ],
      { cwd: initialResult.workDir, encoding: 'utf8' }
    );

    if (verify.status !== 0) {
      throw new Error(`Verifier failed: ${verify.stderr || verify.stdout}`);
    }
  });

  test('manifest links every exhibit and omits private fields', () => {
    const manifest = initialResult.manifest;
    const exhibits = manifest?.manifest?.exhibits ?? [];
    expect(exhibits).toHaveLength(2);
    exhibits.forEach((exhibit: any) => {
      expect(exhibit).toEqual(
        expect.objectContaining({
          hash: expect.any(String),
          path: expect.stringMatching(/^exhibits\//),
          size: expect.any(Number),
          license: expect.any(String),
        }),
      );
      expect(exhibit).not.toHaveProperty('originalPath');
    });

    const files = manifest?.manifest?.files ?? [];
    const pdfEntry = files.find((file: any) => file.path === 'report.pdf');
    expect(pdfEntry).toEqual(
      expect.objectContaining({
        size: expect.any(Number),
        contentType: 'application/pdf',
      }),
    );
    expect(pdfEntry?.size).toBeGreaterThan(0);

    expect(manifest?.manifest?.summary).toEqual(
      expect.objectContaining({
        files: files.length,
        exhibits: exhibits.length,
      }),
    );
    expect(manifest?.manifest?.mediaTypes).toEqual(
      expect.arrayContaining(['application/pdf', 'text/html; charset=utf-8']),
    );

    const caseEntry = manifest?.case;
    expect(caseEntry).not.toHaveProperty('privateNotes');
  });

  test('supports remote attachments with integrity verification', async () => {
    const remoteContent = 'Remote exhibit content for disclosure packaging tests.';
    const server = createServer((_, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(remoteContent);
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    const uri = `http://127.0.0.1:${port}/remote.txt`;
    const expectedHash = sha(remoteContent);

    try {
      const bundle = await buildDisclosureBundle({
        caseId: CASE_ID,
        claimIds: CLAIM_IDS,
        attachments: [
          { uri, name: 'Remote Exhibit.txt', license: 'CC-BY-4.0', sha256: expectedHash },
        ],
        generationTimestamp: '2024-01-05T00:00:00.000Z',
      });

      const [remoteExhibit] = bundle.manifest?.manifest?.exhibits ?? [];
      expect(remoteExhibit).toEqual(
        expect.objectContaining({
          hash: expectedHash,
          size: Buffer.byteLength(remoteContent),
        }),
      );
      await fs.access(path.join(bundle.workDir, remoteExhibit.path));
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
    }
  });

  test('rejects remote attachments that exceed declared content length limits', async () => {
    const server = createServer((_, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain', 'Content-Length': '4096' });
      res.end('content that should never be read');
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    const uri = `http://127.0.0.1:${port}/too-large.txt`;

    try {
      await expect(
        buildDisclosureBundle({
          caseId: CASE_ID,
          claimIds: CLAIM_IDS,
          attachments: [
            {
              uri,
              name: 'Too Large.txt',
              license: 'CC-BY-4.0',
              maxSizeBytes: 128,
            },
          ],
          generationTimestamp: '2024-01-05T00:00:00.000Z',
        }),
      ).rejects.toMatchObject({ code: 'ATTACHMENT_SIZE_EXCEEDED' });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  });

  test('rejects attachments with mismatched hashes', async () => {
    await expect(
      buildDisclosureBundle({
        caseId: CASE_ID,
        claimIds: CLAIM_IDS,
        attachments: [
          { path: attachmentPaths[0], sha256: '0'.repeat(64) },
        ],
      }),
    ).rejects.toMatchObject({ code: 'ATTACHMENT_HASH_MISMATCH' });
  });

  test('pdf hash remains stable for visual regression', async () => {
    const buffer = await fs.readFile(initialResult.pdfPath);
    const actual = sha(buffer);
    expect(actual).toBe(EXPECTED_PDF_HASH);
    expect(initialResult.pdfSha256).toBe(EXPECTED_PDF_HASH);
  });

  test('checksums enumerate the generated report artifacts', async () => {
    const checksums = await fs.readFile(initialResult.checksumsPath, 'utf8');
    const lines = checksums
      .trim()
      .split('\n')
      .filter(Boolean);

    expect(lines).toHaveLength(4);
    expect(lines.some((line) => line.endsWith('report.pdf'))).toBe(true);
    expect(lines.some((line) => line.endsWith('report.html'))).toBe(true);
    expect(lines.every((line) => line.includes('  '))).toBe(true);
  });

  test('rejects directory attachments', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'disclosure-dir-'));

    await expect(
      buildDisclosureBundle({
        caseId: CASE_ID,
        attachments: [{ path: directory }],
      }),
    ).rejects.toMatchObject({ code: 'ATTACHMENT_INVALID' });
  });
});
