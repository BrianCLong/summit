import { runDeconvPipeline } from '../../src/graphrag/omics/pipelines/runDeconv';
import * as fs from 'fs';
import * as path from 'path';

describe('Omics Deconvolution Pipeline', () => {
  beforeEach(() => {
    process.env.SUMMIT_OMICS_DECONV = 'true';
  });

  afterEach(() => {
    delete process.env.SUMMIT_OMICS_DECONV;
  });

  it('should run successfully and create a report.json artifact', () => {
    const sampleFile = path.resolve(__dirname, '../../data/omics/test_bulk_rna.tsv');
    const outDir = path.resolve(__dirname, '../../artifacts/omics/deconv');

    const outFile = runDeconvPipeline(sampleFile, outDir);

    expect(fs.existsSync(outFile)).toBe(true);

    const report = JSON.parse(fs.readFileSync(outFile, 'utf8'));

    expect(report.sample_id).toBe('test_bulk_rna');
    expect(report.cell_types.T_cell).toBe(0.31);
  });
});
