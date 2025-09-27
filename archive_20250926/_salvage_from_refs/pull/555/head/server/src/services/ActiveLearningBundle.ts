import fs from 'fs';
import path from 'path';

/**
 * buildBundle exports reviewed items with DLP masks per tenant.
 * Stub implementation writes a manifest file and returns path.
 */
export async function buildBundle(opts: { tenantId: string; since: string; outDir: string }) {
  const manifest = {
    tenantId: opts.tenantId,
    since: opts.since,
    generatedAt: new Date().toISOString(),
    items: []
  };
  const dir = path.join(opts.outDir, opts.tenantId);
  await fs.promises.mkdir(dir, { recursive: true });
  const manifestPath = path.join(dir, 'manifest.json');
  await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  return { manifestPath };
}
