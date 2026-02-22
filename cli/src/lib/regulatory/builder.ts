import * as fs from 'fs';
import * as path from 'path';
import { fetchEuGpaiGuidelines } from './sources/eu_gpai_guidelines.js';
import { fetchFedramp20xKsis } from './sources/fedramp_20x_ksis.js';
import { fetchDodAiStrategy } from './sources/dod_ai_strategy_2026.js';

export async function buildRegulatoryArtifacts(outputDir: string) {
  // Ensure output dir exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Process EU GPAI
  const euSource = await fetchEuGpaiGuidelines();
  await processSource(euSource, 'eu-gpai', outputDir);

  // Process FedRAMP
  const fedrampSource = await fetchFedramp20xKsis();
  await processSource(fedrampSource, 'fedramp-20x', outputDir);

  // Process DoD
  const dodSource = await fetchDodAiStrategy();
  await processSource(dodSource, 'dod-ai-strategy', outputDir);
}

async function processSource(source: any, slug: string, outputDir: string) {
    const dir = path.join(outputDir, slug);
    fs.mkdirSync(dir, { recursive: true });

    // 1. ControlPack
    const controlPack = {
        slug: slug,
        claimRegistryVersion: "1.0.0",
        sources: [source],
        controls: []
    };

    // Deterministic sort keys
    const sortedControlPack = sortKeys(controlPack);

    fs.writeFileSync(path.join(dir, 'controlpack.json'), JSON.stringify(sortedControlPack, null, 2));

    // 2. ClaimMap
    const claimMap = {
        controlPackSlug: slug,
        mappings: []
    };
    fs.writeFileSync(path.join(dir, 'claimmap.json'), JSON.stringify(claimMap, null, 2));

    // 3. Stamp
    const stamp = {
        generatedAt: new Date().toISOString(),
        sourceEtag: source.etag
    };
    fs.writeFileSync(path.join(dir, 'stamp.json'), JSON.stringify(stamp, null, 2));
}

function sortKeys(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(sortKeys);
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).sort().reduce((acc: any, key) => {
            acc[key] = sortKeys(obj[key]);
            return acc;
        }, {});
    }
    return obj;
}
