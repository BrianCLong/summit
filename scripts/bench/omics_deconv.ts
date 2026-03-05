import { runDeconvPipeline } from '../../src/graphrag/omics/pipelines/runDeconv.ts';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.SUMMIT_OMICS_DECONV = 'true';
const sampleFile = path.resolve(__dirname, '../../data/omics/test_bulk_rna.tsv');
const outDir = path.resolve(__dirname, '../../artifacts/omics/deconv');

const start = Date.now();
for (let i = 0; i < 1000; i++) {
  runDeconvPipeline(sampleFile, outDir);
}
const end = Date.now();
console.log(`Cohort benchmark (1000 samples) completed in ${end - start} ms`);
