import { WorldSpec, WorldRunArtifacts } from './WorldSpec.js';
import { TickEngine } from './TickEngine.js';
import * as fs from 'fs';
import * as path from 'path';

export class WorldKernel {
  spec: WorldSpec;
  tickEngine: TickEngine;

  constructor(spec: WorldSpec) {
    this.spec = spec;
    this.tickEngine = new TickEngine(spec);
  }

  run(): WorldRunArtifacts {
    while (this.tickEngine.step()) {
      // Execute tick
    }

    const reportPath = 'reports/civilization/report.json';
    const metricsPath = 'reports/civilization/metrics.json';
    const stampPath = 'reports/civilization/stamp.json';

    fs.mkdirSync('reports/civilization', { recursive: true });

    fs.writeFileSync(reportPath, JSON.stringify({ status: 'success', ticks: this.spec.ticks }, null, 2));
    fs.writeFileSync(metricsPath, JSON.stringify({ runTime: 0, memory: 0 }, null, 2));
    fs.writeFileSync(stampPath, JSON.stringify({ timestamp: new Date().toISOString() }, null, 2));

    return { reportPath, metricsPath, stampPath };
  }
}
