import { runDeconvPipeline } from '../../src/graphrag/omics/pipelines/runDeconv.ts';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.SUMMIT_OMICS_DECONV = 'true';
const sampleFile = path.resolve(__dirname, '../../data/omics/test_bulk_rna.tsv');
const outDir = path.resolve(__dirname, '../../artifacts/omics/deconv');

const outFile = runDeconvPipeline(sampleFile, outDir);

if (!fs.existsSync(outFile)) {
  console.error("FAILED: Artifact not created");
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(outFile, 'utf8'));

if (report.sample_id !== 'test_bulk_rna' || report.cell_types.T_cell !== 0.31) {
  console.error("FAILED: Report content mismatch");
  process.exit(1);
}

console.log("SUCCESS: Pipeline executed correctly");
