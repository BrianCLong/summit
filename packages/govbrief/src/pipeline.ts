import fs from 'node:fs/promises';
import path from 'node:path';

import { fetchWithWayback, writeFile } from './fetcher.js';
import { composeBrief } from './pcs.js';
import { generateClaims } from './claims.js';
import { extractArticleRecord } from './normalize.js';
import { reviewSafety } from './safety.js';
import { computeSha256 } from './utils.js';
import {
  ArticleRecord,
  ClaimRecord,
  ProvenanceRecord,
  SafetyReview
} from './types.js';

interface PipelineResult {
  article: ArticleRecord;
  claims: ClaimRecord[];
  provenance: ProvenanceRecord;
  safety: SafetyReview;
  artifactDir: string;
}

async function readPackageVersion(): Promise<string> {
  const packagePath = new URL('../package.json', import.meta.url);
  const contents = await fs.readFile(packagePath);
  const data = JSON.parse(contents.toString());
  return data.version ?? '0.0.0';
}

function buildArtifactDir(hash: string, baseDir = 'artifacts'): string {
  return path.join(baseDir, hash);
}

export async function runFetch(url: string, baseDir = 'artifacts'): Promise<PipelineResult> {
  const fetchResult = await fetchWithWayback(url);
  const hash = computeSha256(fetchResult.html);
  const artifactDir = buildArtifactDir(hash, baseDir);

  await writeFile(artifactDir, 'raw.html', fetchResult.html);

  const article = extractArticleRecord(fetchResult.html, fetchResult.usedUrl, fetchResult.archiveUrl);
  const cleanText = article.sections.map((section) => section.text).join('\n\n');
  await writeFile(artifactDir, 'clean.txt', cleanText);

  const claims = generateClaims(article, hash);
  const safety = reviewSafety(claims);
  const version = await readPackageVersion();

  const provenance: ProvenanceRecord = {
    retrievedAt: fetchResult.retrievedAt,
    sourceUrl: fetchResult.usedUrl,
    archiveUrl: fetchResult.archiveUrl,
    sha256: hash,
    toolVersions: {
      govbrief: version
    }
  };

  await writeFile(artifactDir, 'article.json', JSON.stringify(article, null, 2));
  await writeFile(artifactDir, 'claims.json', JSON.stringify(claims, null, 2));
  await writeFile(artifactDir, 'provenance.json', JSON.stringify(provenance, null, 2));
  await writeFile(artifactDir, 'safety.json', JSON.stringify(safety, null, 2));

  return {
    article,
    claims,
    provenance,
    safety,
    artifactDir
  };
}

export async function runBrief(artifactDir: string): Promise<string> {
  const [articleRaw, claimsRaw, provenanceRaw, safetyRaw] = await Promise.all([
    fs.readFile(path.join(artifactDir, 'article.json'), 'utf8'),
    fs.readFile(path.join(artifactDir, 'claims.json'), 'utf8'),
    fs.readFile(path.join(artifactDir, 'provenance.json'), 'utf8'),
    fs.readFile(path.join(artifactDir, 'safety.json'), 'utf8')
  ]);

  const article: ArticleRecord = JSON.parse(articleRaw);
  const claims: ClaimRecord[] = JSON.parse(claimsRaw);
  const provenance: ProvenanceRecord = JSON.parse(provenanceRaw);
  const safety: SafetyReview = JSON.parse(safetyRaw);

  if (safety.flags.some((flag) => flag.severity === 'high')) {
    throw new Error('Brief generation blocked: high-severity safety flags present.');
  }

  const brief = composeBrief(article, claims, provenance, safety);
  await writeFile(artifactDir, 'brief.md', brief);
  return brief;
}
