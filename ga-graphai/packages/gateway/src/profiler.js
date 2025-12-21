import inspector from 'node:inspector';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

function summarizeProfile(profile) {
  const samples = profile.samples ?? [];
  const timeDeltas = profile.timeDeltas ?? [];
  const nodesById = new Map();
  for (const node of profile.nodes ?? []) {
    nodesById.set(node.id, node);
  }
  const durations = new Map();
  samples.forEach((nodeId, index) => {
    const duration = timeDeltas[index] ?? 0;
    const prev = durations.get(nodeId) ?? 0;
    durations.set(nodeId, prev + duration);
  });
  const offenders = Array.from(durations.entries())
    .map(([nodeId, micros]) => {
      const node = nodesById.get(nodeId);
      const functionName = node?.callFrame?.functionName || '(anonymous)';
      const url = node?.callFrame?.url || 'inline';
      return { functionName, url, selfTimeMs: micros / 1000 };
    })
    .sort((a, b) => b.selfTimeMs - a.selfTimeMs)
    .slice(0, 10);
  return offenders;
}

export class CpuProfiler {
  constructor({ outputDir = path.join(tmpdir(), 'gateway-profiles') } = {}) {
    this.outputDir = outputDir;
    mkdirSync(this.outputDir, { recursive: true });
    this.session = undefined;
    this.running = false;
  }

  async send(method, params) {
    return new Promise((resolve, reject) => {
      if (!this.session) {
        reject(new Error('Profiler session not initialized'));
        return;
      }
      this.session.post(method, params ?? {}, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  async capture(label = 'gateway', durationMs = 15000) {
    if (this.running) {
      throw new Error('PROFILE_IN_PROGRESS');
    }
    this.session = new inspector.Session();
    this.session.connect();
    this.running = true;
    await this.send('Profiler.enable');
    await this.send('Profiler.start');
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    const { profile } = await this.send('Profiler.stop');
    this.session.disconnect();
    this.session = undefined;
    this.running = false;
    const filename = `${label}-${Date.now()}.cpuprofile`;
    const filePath = path.join(this.outputDir, filename);
    writeFileSync(filePath, JSON.stringify(profile), 'utf8');
    return {
      durationMs,
      filePath,
      samples: profile.samples?.length ?? 0,
      topOffenders: summarizeProfile(profile),
    };
  }
}
