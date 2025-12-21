import fs from 'fs/promises';
import path from 'path';
import exifr from 'exifr';

export type ExifLite = {
  camera: string;
  ts: string;
  orientation?: number;
  size: number;
};

function ensureFilePath(file: string) {
  if (!file || typeof file !== 'string') throw new Error('file_required');
  if (!path.isAbsolute(file) && file.trim().length === 0) throw new Error('file_required');
}

export async function readExifLite(file: string): Promise<ExifLite> {
  ensureFilePath(file);
  const stats = await fs.stat(file);
  if (!stats.isFile()) throw new Error('not_a_file');

  let parsed: any;
  try {
    parsed = await exifr.parse(file, {
      pick: ['Make', 'Model', 'DateTimeOriginal', 'Orientation'],
    });
  } catch (err) {
    parsed = null;
  }

  const make = parsed?.Make?.toString().trim();
  const model = parsed?.Model?.toString().trim();
  const camera = [make, model].filter(Boolean).join(' ').trim() || 'unknown';
  const tsSource = parsed?.DateTimeOriginal instanceof Date ? parsed.DateTimeOriginal : new Date(stats.mtimeMs);
  const orientation = typeof parsed?.Orientation === 'number' ? parsed.Orientation : undefined;

  return {
    camera,
    ts: new Date(tsSource).toISOString(),
    orientation,
    size: stats.size,
  };
}

export default readExifLite;
