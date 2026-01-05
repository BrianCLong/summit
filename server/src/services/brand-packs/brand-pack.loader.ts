import { promises as fs } from 'fs';
import path from 'path';
import { BrandPackSchema, type BrandPack } from './brand-pack.schema.js';

const PACKS_DIR = path.resolve(
  process.cwd(),
  'server',
  'src',
  'services',
  'brand-packs',
  'packs',
);

const normalizePackId = (packId: string): string =>
  packId.endsWith('.json') ? packId : `${packId}.json`;

export async function loadBrandPack(packId: string): Promise<BrandPack> {
  const fileName = normalizePackId(packId);
  const filePath = path.join(PACKS_DIR, fileName);
  const contents = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(contents);
  return BrandPackSchema.parse(parsed);
}
