import path from 'path';
import fs from 'fs/promises';
import { Pool } from 'pg';
import { verifyPackage } from './verify.js';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function syncRunbooks(baseDir?: string) {
  const dir =
    baseDir ||
    process.env.GITOPS_PATH ||
    path.resolve(process.cwd(), 'runbooks');
  let count = 0;
  async function visit(d: string) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await visit(p);
      else if (e.name === 'runbook.yaml') {
        const pkgDir = path.dirname(p);
        const parts = pkgDir.split(path.sep);
        const version = parts.pop()!;
        const name = parts.pop()!;
        const family = parts.pop()!;
        const v = await verifyPackage(pkgDir).catch(() => ({ ok: false }));
        await pg.query(
          `INSERT INTO runbook_versions(family,name,version,entry_path,signed,active)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (family,name,version) DO UPDATE SET entry_path=$4, signed=$5`,
          [family, name, version, p, v.ok, false],
        );
        count++;
      }
    }
  }
  await visit(dir);
  return { synced: count };
}
