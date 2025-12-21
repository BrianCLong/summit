import fs from 'fs';
import exifParser from 'exif-parser';

export type ExifLite = { camera: string; ts: string; orientation?: number; hasExif: boolean };

export function readExifLite(file: string): ExifLite {
  const buf = fs.readFileSync(file);
  const stats = fs.statSync(file);
  try {
    const parsed = exifParser.create(buf).parse();
    const tsSource = parsed.tags.DateTimeOriginal
      ? new Date(parsed.tags.DateTimeOriginal * 1000)
      : stats.mtime;
    const make = parsed.tags.Make ? String(parsed.tags.Make).trim() : '';
    const model = parsed.tags.Model ? String(parsed.tags.Model).trim() : '';
    const camera = `${make} ${model}`.trim() || 'unknown';
    return {
      camera,
      ts: tsSource.toISOString(),
      orientation: parsed.tags.Orientation,
      hasExif: Object.keys(parsed.tags ?? {}).length > 0,
    };
  } catch (err) {
    return { camera: 'unknown', ts: stats.mtime.toISOString(), hasExif: false };
  }
}
