import path from 'node:path';
import { findHotspots } from './hotspots.js';
import { signPayload } from './signature.js';
import { diffTaxonomies, loadTaxonomy } from './taxonomy.js';
import { ImpactReport, LintOptions } from './types.js';

export const buildImpactReport = async (
  options: LintOptions,
): Promise<ImpactReport> => {
  const baseline = await loadTaxonomy(options.baselinePath);
  const updated = await loadTaxonomy(options.updatedPath);
  const diff = diffTaxonomies(baseline, updated);
  const hotspots = await findHotspots(options.repoRoot, diff);

  const payload = {
    generatedAt: new Date().toISOString(),
    baselineVersion: baseline.version,
    updatedVersion: updated.version,
    jurisdiction: updated.jurisdiction ?? baseline.jurisdiction,
    diff,
    hotspots,
  };

  const signature = signPayload(payload, options.signingKey, options.keyId);

  return {
    ...payload,
    signature,
  };
};

export const resolveRepoRoot = (input?: string): string => {
  if (!input) {
    return process.cwd();
  }
  if (path.isAbsolute(input)) {
    return input;
  }
  return path.resolve(process.cwd(), input);
};
