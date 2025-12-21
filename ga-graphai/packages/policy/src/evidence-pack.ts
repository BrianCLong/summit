import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { gzipSync, gunzipSync } from 'node:zlib';

export type EvidenceSource =
  | { type: 'file'; path: string }
  | { type: 'inline'; name: string; content: string };

export interface EvidenceItem {
  name: string;
  hash: string;
  bytes: number;
}

export interface EvidencePack {
  manifest: EvidenceItem[];
  pack: Buffer;
}

export class EvidencePackGenerator {
  constructor(private readonly baseDir: string = process.cwd()) {}

  generate(sources: EvidenceSource[]): EvidencePack {
    const normalized = sources.map((source) => {
      if (source.type === 'file') {
        const resolved = path.isAbsolute(source.path)
          ? source.path
          : path.join(this.baseDir, source.path);
        const content = readFileSync(resolved);
        return { name: path.relative(this.baseDir, resolved), content };
      }
      return { name: source.name, content: Buffer.from(source.content) };
    });

    const manifest: EvidenceItem[] = normalized
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => ({
        name: item.name,
        hash: createHash('sha256').update(item.content).digest('hex'),
        bytes: item.content.byteLength,
      }));

    const bundle = {
      createdAt: new Date().toISOString(),
      manifest,
      payload: normalized.reduce<Record<string, string>>((acc, item) => {
        acc[item.name] = item.content.toString('base64');
        return acc;
      }, {}),
    };

    const pack = gzipSync(Buffer.from(JSON.stringify(bundle)));
    return { manifest, pack };
  }

  static unpack(pack: Buffer): { manifest: EvidenceItem[]; payload: Record<string, Buffer> } {
    const raw = JSON.parse(gunzipSync(pack).toString('utf-8')) as {
      manifest: EvidenceItem[];
      payload: Record<string, string>;
    };
    const payload: Record<string, Buffer> = {};
    Object.entries(raw.payload).forEach(([name, content]) => {
      payload[name] = Buffer.from(content, 'base64');
    });
    return { manifest: raw.manifest, payload };
  }
}

export function createEvidenceWorkspace(prefix = 'evidence-pack-'): string {
  const dir = path.join(tmpdir(), `${prefix}${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function cleanupEvidenceWorkspace(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

export function writeEvidenceFile(dir: string, name: string, content: string): string {
  const target = path.join(dir, name);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf-8');
  return target;
}
