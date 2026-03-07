import * as fs from 'fs';
import * as path from 'path';

// Using inline types and logic to avoid ESM/CJS resolution issues from tsx
export type Narrative = {
  id: string; // NAR:<slug>
  canonicalLabel: string;
  keyPhrases: string[];
  firstSeenAt: string | null;
  languages: string[];
  intendedAudiences: string[];
  evidenceIds: string[];
};

export type Claim = {
  id: string;
  text: string;
  stance: string;
  emotionalTone: string;
  narrativeIds?: string[];
  evidenceIds: string[];
};

export type ConnectivityState = {
  region: string;
  platform: string;
  state: "normal" | "throttled" | "shutdown";
  startedAt: string | null;
  endedAt: string | null;
  evidenceIds: string[];
};

export function visibilityGap(connectivity: "normal" | "throttled" | "shutdown", localEvidenceCount: number): boolean {
  return connectivity !== "normal" && localEvidenceCount < 3;
}

export function computeNarrativeShare(claims: Claim[], narrativeId: string): number {
  const total = claims.length || 1;
  return claims.filter(c => c.narrativeIds?.includes(narrativeId)).length / total;
}


export function generateReport(datasetPath: string, outputDir: string) {
  const data = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));

  const narratives: Narrative[] = data.narratives;
  const claims: Claim[] = data.claims;
  const connectivity: ConnectivityState[] = data.connectivity;

  // Create metrics
  const metrics = {
    narrativeShares: narratives.map(n => ({
      id: n.id,
      share: computeNarrativeShare(claims, n.id)
    })),
    totalClaims: claims.length
  };

  // Create report
  const isGap = connectivity.some(c => visibilityGap(c.state as any, claims.length));

  const report = {
    topNarratives: narratives.map(n => n.id),
    visibilityGap: isGap,
    evidenceReferences: claims.map(c => c.evidenceIds).flat()
  };

  // Deterministic Stamp
  const stamp = {
    schemaVersion: "1.0",
    mode: "deterministic"
  };

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outputDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
  fs.writeFileSync(path.join(outputDir, 'stamp.json'), JSON.stringify(stamp, null, 2));

  // Generate Brief Markdown
  const brief = `# Narrative SITREP: Iran War

## Visibility Gap
${isGap ? "WARNING: High visibility gap due to throttled or shutdown connectivity." : "Normal visibility."}

## Top Narratives
${narratives.map(n => `- **${n.canonicalLabel}** (Share: ${metrics.narrativeShares.find(s => s.id === n.id)?.share})`).join('\n')}

## Evidence Used
${report.evidenceReferences.join(', ')}
`;

  fs.writeFileSync(path.join(outputDir, 'brief.md'), brief);
}
