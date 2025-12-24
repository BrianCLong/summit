import { jest } from '@jest/globals';

const mockQuery = jest.fn(async (text: string, params: any[]) => {
  if (text.startsWith('INSERT INTO evidence')) {
    return {
      rows: [
        {
          id: 'e1',
          sha256: params[0],
          contentType: params[1],
          createdAt: new Date('2024-01-01T00:00:00Z'),
        },
      ],
    };
  }
  if (text.startsWith('INSERT INTO claim')) {
    return {
      rows: [
        {
          id: `c${mockQuery.mock.calls.length}`,
          hashRoot: params[1],
        },
      ],
    };
  }
  if (text.startsWith('SELECT * FROM claim')) {
    return {
      rows: [
        { id: 'c1', hash_root: 'root1', transform_chain: ['trim'] },
        { id: 'c2', hash_root: 'root2', transform_chain: ['ocr', 'normalize'] },
      ],
    };
  }
  throw new Error(`unexpected query: ${text}`);
});

jest.unstable_mockModule('../../src/db', () => ({
  query: mockQuery,
}));

const { addClaim, exportManifest, addEvidence } = await import('../../src/ledger');

describe('ledger', () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  test('claim produces deterministic hashRoot', async () => {
    const c1 = await addClaim(['a', 'b'], ['trim', 'ocr']);
    const c2 = await addClaim(['b', 'a'], ['trim', 'ocr']);
    expect(c1.hashRoot).toBe(c2.hashRoot);
  });

  test('addEvidence persists metadata', async () => {
    const sha = 'a'.repeat(64);
    const ev = await addEvidence(sha, 'text/plain');
    expect(ev).toMatchObject({ sha256: sha, contentType: 'text/plain' });
  });

  test('exportManifest returns base64 manifest', async () => {
    const manifestB64 = await exportManifest('case-123');
    const manifest = JSON.parse(Buffer.from(manifestB64, 'base64').toString());
    expect(manifest.caseId).toBe('case-123');
    expect(manifest.claims).toHaveLength(2);
    expect(manifest.signature).toMatchObject({ alg: 'none', kid: 'dev' });
  });
});
