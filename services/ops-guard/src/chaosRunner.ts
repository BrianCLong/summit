import { randomUUID } from 'crypto';
import { OpsGuardConfig } from './config.js';
import { ChaosDrillRun } from './types.js';
import { Logger } from './logger.js';

const scenarios = [
  'graph-saturation-surge',
  'partial-metrics-outage',
  'planner-cost-regression'
];

const followUps = [
  'Create incident follow-up to tighten admission control',
  'Add replay for dropped telemetry batches',
  'Regenerate cached neighborhood indexes'
];

const lessons = [
  'Pre-warm caches before surge windows',
  'Fail-open is acceptable for observability-only paths',
  'Budget gates should degrade gracefully'
];

export class ChaosRunner {
  private history: ChaosDrillRun[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly config: OpsGuardConfig,
    private readonly logger: Logger
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.run();
    }, this.config.chaosIntervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  run(): ChaosDrillRun {
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    const outcome: ChaosDrillRun['outcome'] = Math.random() > 0.3 ? 'recovered' : 'degraded';
    const sloDelta = outcome === 'recovered' ? 0.05 : -0.1;

    const run: ChaosDrillRun = {
      scenario,
      followUpTasks: [
        `${randomUUID()}: ${followUps[Math.floor(Math.random() * followUps.length)]}`
      ],
      lessonsLearned: [lessons[Math.floor(Math.random() * lessons.length)]],
      outcome,
      sloDelta,
      timestamp: Date.now()
    };

    this.history.push(run);
    this.logger.info(run, 'Chaos drill completed');
    return run;
  }

  getTasks(): string[] {
    return this.history.flatMap((run) => run.followUpTasks);
  }

  sloTrend(): { runs: number; cumulativeDelta: number } {
    const cumulativeDelta = this.history.reduce((acc, run) => acc + run.sloDelta, 0);
    return { runs: this.history.length, cumulativeDelta };
  }
}
