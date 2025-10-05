import fs from 'node:fs';
import path from 'node:path';

type BenchmarkRun = {
  server: string;
  platform: string;
  metrics: {
    latency_ms?: { p50?: number; p95?: number; p99?: number };
    cold_start_ms?: { p95?: number };
    sse_latency_ms?: { p95?: number };
    error_rate?: number;
    cost_per_1k_calls_usd?: number;
  };
};

interface ShootoutData {
  runs: BenchmarkRun[];
}

interface BadgeData {
  server: string;
  version?: string;
  checks?: Record<string, string>;
  latency?: Record<string, number | null>;
  sandbox?: Record<string, string>;
  replay?: Record<string, number | null>;
  generatedAt?: string;
}

async function loadJSON<T>(filePath: string): Promise<T | null> {
  try {
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

async function getShootout(): Promise<{ benchmarks: ShootoutData | null; badges: BadgeData[] }> {
  const benchmarks = await loadJSON<ShootoutData>(path.join(process.cwd(), 'benchmarks', 'shootout', 'results.json'));

  const badgesDir = path.join(process.cwd(), 'docs', 'reports', 'badges');
  let badges: BadgeData[] = [];
  try {
    const entries = await fs.promises.readdir(badgesDir);
    badges = (
      await Promise.all(
        entries
          .filter((file) => file.endsWith('.json'))
          .map((file) => loadJSON<BadgeData>(path.join(badgesDir, file)))
      )
    ).filter((badge): badge is BadgeData => Boolean(badge));
  } catch {
    badges = [];
  }

  return { benchmarks, badges };
}

function formatNumber(value?: number | null, suffix = '') {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return `${value.toFixed(0)}${suffix}`;
}

export default async function Page() {
  const { benchmarks, badges } = await getShootout();
  const runs = benchmarks?.runs ?? [];

  const intelgraphRuns = runs.filter((run) => run.platform === 'intelgraph');

  return (
    <main>
      <header>
        <h1>IntelGraph MCP Shootout</h1>
        <p>
          Signed benchmarks, conformance badges, and replay evidence for Maestro Conductor versus the field. All data is
          reproducible via the public harness.
        </p>
      </header>

      <section>
        <h2>Benchmark Leaderboard</h2>
        {intelgraphRuns.length === 0 ? (
          <p>No benchmark data found. Run the harness to populate benchmarks/shootout/results.json.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Server</th>
                <th>p50 (ms)</th>
                <th>p95 (ms)</th>
                <th>Cold Start p95 (ms)</th>
                <th>SSE p95 (ms)</th>
                <th>Error Rate</th>
                <th>Cost /1k Calls</th>
              </tr>
            </thead>
            <tbody>
              {intelgraphRuns.map((run) => (
                <tr key={`${run.server}-${run.platform}`}>
                  <td>{run.server}</td>
                  <td>{formatNumber(run.metrics.latency_ms?.p50)}</td>
                  <td>{formatNumber(run.metrics.latency_ms?.p95)}</td>
                  <td>{formatNumber(run.metrics.cold_start_ms?.p95)}</td>
                  <td>{formatNumber(run.metrics.sse_latency_ms?.p95)}</td>
                  <td>{run.metrics.error_rate !== undefined ? `${(run.metrics.error_rate * 100).toFixed(2)}%` : '—'}</td>
                  <td>{run.metrics.cost_per_1k_calls_usd !== undefined ? `$${run.metrics.cost_per_1k_calls_usd.toFixed(3)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Conformance & Sandbox Badges</h2>
        {badges.length === 0 ? (
          <p>No badge JSON found. Run the conformance CLI with --badge-out to generate badges.</p>
        ) : (
          badges.map((badge) => (
            <article key={`${badge.server}-${badge.version ?? 'latest'}`} style={{ marginBottom: '2rem' }}>
              <h3>
                {badge.server} <small style={{ fontWeight: 400 }}>v{badge.version ?? 'n/a'}</small>
              </h3>
              <p>Generated: {badge.generatedAt ?? 'n/a'}</p>
              <div>
                <strong>Checks:</strong>
                <ul>
                  {badge.checks &&
                    Object.entries(badge.checks).map(([key, value]) => (
                      <li key={key} className={value === 'pass' ? 'badge-pass' : 'badge-fail'}>
                        {key}: {value}
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <strong>Latency:</strong>
                <ul>
                  {badge.latency &&
                    Object.entries(badge.latency).map(([key, value]) => (
                      <li key={key}>{key}: {formatNumber(value, ' ms')}</li>
                    ))}
                </ul>
              </div>
              <div>
                <strong>Sandbox:</strong>
                <ul>
                  {badge.sandbox &&
                    Object.entries(badge.sandbox).map(([key, value]) => (
                      <li key={key}>{key}: {value}</li>
                    ))}
                </ul>
              </div>
              <div>
                <strong>Replay:</strong>
                <ul>
                  {badge.replay &&
                    Object.entries(badge.replay).map(([key, value]) => (
                      <li key={key}>{key}: {value === null || value === undefined ? '—' : value}</li>
                    ))}
                </ul>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
