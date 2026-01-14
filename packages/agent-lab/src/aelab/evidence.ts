import fs from 'fs';
import path from 'path';

import { AELabRunConfig, ChampionRecord } from './types';

export interface EvidenceManifest {
  runId: string;
  gitSha: string;
  startedAt: string;
  completedAt?: string;
  config: AELabRunConfig;
  policy: {
    policyVersion: string;
    offline: boolean;
    allowedTools: string[];
  };
  promptTemplates: AELabRunConfig['promptTemplates'];
}

export class EvidenceBundle {
  readonly runRoot: string;
  private manifest: EvidenceManifest;

  constructor(baseDir: string, config: AELabRunConfig) {
    this.runRoot = path.join(baseDir, config.runId);
    this.manifest = {
      runId: config.runId,
      gitSha: process.env.GITHUB_SHA || process.env.GIT_SHA || 'unknown',
      startedAt: new Date().toISOString(),
      config,
      policy: config.safety,
      promptTemplates: config.promptTemplates,
    };
  }

  init() {
    fs.mkdirSync(this.runRoot, { recursive: true });
    fs.mkdirSync(path.join(this.runRoot, 'archive'), { recursive: true });
    fs.mkdirSync(path.join(this.runRoot, 'logs'), { recursive: true });
    this.writeManifest();
  }

  writeManifest(completedAt?: string) {
    if (completedAt) {
      this.manifest.completedAt = completedAt;
    }
    const manifestPath = path.join(this.runRoot, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(this.manifest, null, 2));
    return manifestPath;
  }

  appendEvent(event: Record<string, unknown>) {
    const logPath = path.join(this.runRoot, 'logs', 'events.jsonl');
    fs.appendFileSync(logPath, `${JSON.stringify(event)}\n`);
  }

  appendChampion<TCandidate>(record: ChampionRecord<TCandidate>) {
    const championsPath = path.join(this.runRoot, 'champions.jsonl');
    fs.appendFileSync(championsPath, `${JSON.stringify(record)}\n`);
  }

  writeArchiveSnapshot<TCandidate>(round: number, archive: unknown) {
    const archivePath = path.join(this.runRoot, 'archive', `round-${round}.json`);
    fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2));
    return archivePath;
  }

  writeCheckpoint(state: unknown) {
    const checkpointPath = path.join(this.runRoot, 'checkpoint.json');
    fs.writeFileSync(checkpointPath, JSON.stringify(state, null, 2));
    return checkpointPath;
  }

}
