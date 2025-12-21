import path from 'path';
import { fileURLToPath } from 'url';
import { readExifLite } from '../../src/exif';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(currentDir, '..', 'fixtures', 'sample-exif.jpg');
const fallbackFixture = path.resolve('website/static/img/docusaurus-social-card.jpg');

describe('readExifLite', () => {
  test('returns camera metadata when EXIF is available', async () => {
    const meta = await readExifLite(fixture);
    expect(meta.camera).toBe('SummitCam UnitTest');
    expect(meta.orientation).toBe(1);
    expect(meta.ts.startsWith('2024-11-15T12:34:56')).toBe(true);
    expect(meta.size).toBeGreaterThan(0);
  });

  test('falls back to file stats when EXIF missing', async () => {
    const meta = await readExifLite(fallbackFixture);
    expect(meta.camera.length).toBeGreaterThan(0);
    expect(() => new Date(meta.ts)).not.toThrow();
    expect(meta.size).toBeGreaterThan(0);
  });

  test('rejects invalid path', async () => {
    await expect(readExifLite('')).rejects.toThrow('file_required');
  });
});
