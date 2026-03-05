import { DeconvModel } from '../deconvolution/deconvModel.js';
import { OmicsSample } from '../schema.js';
import { generateCypher } from '../graph/cellGraph.js';
import * as fs from 'fs';
import * as path from 'path';

export function runDeconvPipeline(sampleFile: string, outDir: string): string {
  const model = new DeconvModel();

  // Fake parsing of TSV to JSON
  const content = fs.readFileSync(sampleFile, 'utf8');
  const lines = content.split('\n');
  const features: Record<string, number> = {};
  for (const line of lines) {
    if (!line) continue;
    const parts = line.split('\t');
    if (parts.length === 2 && parts[0] !== 'feature') {
      features[parts[0]] = parseFloat(parts[1]);
    }
  }

  const sample: OmicsSample = {
    id: path.basename(sampleFile, '.tsv'),
    modality: "transcriptome",
    features
  };

  const cellTypes = model.infer(sample);

  const report = {
    sample_id: sample.id,
    cell_types: cellTypes
  };

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, 'report.json');
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  // Generate graph cypher
  const cypher = generateCypher(sample.id, cellTypes);
  fs.writeFileSync(path.join(outDir, 'cypher.json'), JSON.stringify(cypher, null, 2));

  return outFile;
}
