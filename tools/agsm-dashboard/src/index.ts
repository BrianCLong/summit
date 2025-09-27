import { readFileSync, watchFile } from 'node:fs';
import { resolve } from 'node:path';
import { formatDistanceToNow } from 'date-fns';

type Aggregates = {
  total: number;
  successes: number;
  failures: number;
  successRate: number;
};

type ProbeResult = {
  name: string;
  scenario: string;
  success: boolean;
  timestamp: string;
  latencyMs: number;
  error?: string;
  canary: boolean;
  failureMode?: string;
};

type Alert = {
  level: string;
  message: string;
  metric?: string;
  threshold?: number;
  observed?: number;
  timestamp: string;
};

type State = {
  lastUpdated: string;
  windowMinutes: number;
  aggregates: Aggregates;
  probes: ProbeResult[];
  alerts: Alert[];
  slo: unknown;
};

type CliOptions = {
  statePath: string;
  watch: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  let statePath = '../../services/agsm/state/metrics.json';
  let watch = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--state' && argv[i + 1]) {
      statePath = argv[i + 1];
      i += 1;
    } else if (arg === '--watch') {
      watch = true;
    }
  }

  return {
    statePath: resolve(process.cwd(), statePath),
    watch,
  };
}

function loadState(path: string): State | undefined {
  try {
    const data = readFileSync(path, 'utf-8');
    if (!data.trim()) {
      return undefined;
    }
    return JSON.parse(data) as State;
  } catch (error) {
    return undefined;
  }
}

function percentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function render(state: State | undefined, path: string): void {
  console.clear();
  console.log('Ambient Governance Synthetic Monitoring');
  console.log('='.repeat(48));

  if (!state) {
    console.log(`No metrics available yet at ${path}`);
    return;
  }

  const updated = new Date(state.lastUpdated);
  const ago = Number.isNaN(updated.getTime())
    ? 'unknown'
    : `${formatDistanceToNow(updated, { addSuffix: true })}`;

  console.log(`Window: last ${state.windowMinutes.toFixed(1)} minutes`);
  console.log(`Updated: ${ago}`);
  console.log('');
  console.log('SLIs');
  console.log('-'.repeat(48));
  console.log(
    `Success rate: ${percentage(state.aggregates.successRate)} (${state.aggregates.successes}/${state.aggregates.total})`
  );
  console.log(`Failures: ${state.aggregates.failures}`);
  console.log('');
  console.log('Recent Probes');
  console.log('-'.repeat(48));
  if (state.probes.length === 0) {
    console.log('No probe executions in window.');
  } else {
    state.probes
      .slice(-10)
      .reverse()
      .forEach((probe) => {
        const status = probe.success ? 'PASS' : 'FAIL';
        const icon = probe.success ? '✅' : '❌';
        const suffix = probe.canary ? ' (canary)' : '';
        console.log(
          `${icon} ${status.padEnd(4)} | ${probe.name} [${probe.scenario}]${suffix} – ${probe.latencyMs}ms`
        );
        if (!probe.success && probe.error) {
          console.log(`    reason: ${probe.error}`);
        }
      });
  }

  console.log('');
  console.log('Alerts');
  console.log('-'.repeat(48));
  if (state.alerts.length === 0) {
    console.log('No alerts in window.');
  } else {
    state.alerts
      .slice(-5)
      .reverse()
      .forEach((alert) => {
        const when = new Date(alert.timestamp);
        const whenText = Number.isNaN(when.getTime())
          ? 'unknown'
          : formatDistanceToNow(when, { addSuffix: true });
        console.log(`${alert.level.toUpperCase().padEnd(8)} ${whenText} :: ${alert.message}`);
      });
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const renderState = () => {
    const state = loadState(options.statePath);
    render(state, options.statePath);
  };

  renderState();

  if (options.watch) {
    watchFile(options.statePath, { interval: 1500 }, () => {
      renderState();
    });
  }
}

void main();
