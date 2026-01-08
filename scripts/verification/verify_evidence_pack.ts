
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';

const ManifestSchema = z.object({
  commit_sha: z.string(),
  tag: z.string().optional(),
  workflow_run_id: z.string().optional(),
  artifacts: z.record(z.string(), z.string()), // filename -> checksum (sha256:...)
  created_at: z.string(),
});

type Manifest = z.infer<typeof ManifestSchema>;

async function verifyEvidencePack() {
  const args = process.argv.slice(2);
  let evidenceDir = 'dist/evidence';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--evidence-dir' && args[i+1]) {
      evidenceDir = args[i+1];
      i++;
    }
  }

  const manifestPath = path.join(evidenceDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(JSON.stringify({ status: 'error', errors: [`Manifest not found at ${manifestPath}`] }, null, 2));
    process.exit(1);
  }

  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = ManifestSchema.parse(JSON.parse(manifestContent));

    const errors: string[] = [];
    const verified: string[] = [];

    for (const [filename, expectedChecksum] of Object.entries(manifest.artifacts)) {
      const filePath = path.join(evidenceDir, filename);
      if (!fs.existsSync(filePath)) {
        errors.push(`Artifact missing: ${filename}`);
        continue;
      }

      const fileBuffer = fs.readFileSync(filePath);
      const algo = expectedChecksum.split(':')[0] || 'sha256'; // Default or parsed
      const expectedHash = expectedChecksum.split(':')[1] || expectedChecksum;

      const hash = crypto.createHash(algo).update(fileBuffer).digest('hex');

      if (hash !== expectedHash) {
        errors.push(`Checksum mismatch for ${filename}: expected ${expectedHash}, got ${hash}`);
      } else {
        verified.push(filename);
      }
    }

    if (errors.length > 0) {
      console.log(JSON.stringify({ status: 'failed', errors, verified, manifest }, null, 2));
      process.exit(1);
    } else {
      console.log(JSON.stringify({ status: 'success', verified, manifest }, null, 2));
    }

  } catch (e) {
    if (e instanceof z.ZodError) {
       console.error(JSON.stringify({ status: 'error', errors: e.errors.map(err => err.message) }, null, 2));
    } else {
       console.error(JSON.stringify({ status: 'error', errors: [(e as Error).message] }, null, 2));
    }
    process.exit(1);
  }
}

verifyEvidencePack();
