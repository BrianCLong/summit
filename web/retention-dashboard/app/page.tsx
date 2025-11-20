import './globals.css';
import '../styles/dashboard.css';

import { KpiCard } from '../components/KpiCard';

const BASE_URL = process.env.NEXT_PUBLIC_RETENTIOND_URL ?? 'http://localhost:8088';

type TargetResult = {
  type: string;
  identifier: string;
  expired: string[];
  deletedCount: number;
};

type Run = {
  policy: string;
  cutoff: string;
  dryRun: boolean;
  targets: TargetResult[];
};

type KpiResponse = {
  policies: {
    policy: string;
    deletedItems: number;
    expiredItems: number;
    cutoff: string;
    dryRun: boolean;
    targets: { type: string; identifier: string; expired: number; deleted: number }[];
  }[];
};

type RunResponse = {
  generatedAt: string;
  runs: Run[];
};

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { cache: 'no-store' });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.warn(`Failed to fetch ${path}`, error);
    return null;
  }
}

async function getDashboardData() {
  const [runs, kpis] = await Promise.all([
    fetchJSON<RunResponse>('/metrics/runs'),
    fetchJSON<KpiResponse>('/metrics/kpis')
  ]);

  return {
    generatedAt: runs?.generatedAt ?? new Date().toISOString(),
    runs: runs?.runs ?? [],
    kpis: kpis?.policies ?? []
  };
}

function renderUpcomingTable(runs: Run[]) {
  if (!runs.length) {
    return <div className="empty-state">No recent retention sweeps recorded.</div>;
  }

  const rows = runs.flatMap(run =>
    run.targets.map(target => ({
      policy: run.policy,
      target: target.identifier,
      type: target.type,
      cutoff: run.cutoff,
      expired: target.expired.length,
      dryRun: run.dryRun
    }))
  );

  return (
    <table className="expirations-table">
      <thead>
        <tr>
          <th>Policy</th>
          <th>Target</th>
          <th>Type</th>
          <th>Expired Items</th>
          <th>Cutoff</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={`${row.policy}-${row.target}`}>
            <td>{row.policy}</td>
            <td>{row.target}</td>
            <td>{row.type}</td>
            <td>{row.expired}</td>
            <td>{new Date(row.cutoff).toLocaleString()}</td>
            <td>{row.dryRun ? 'Dry Run' : 'Deleted'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function Page() {
  const { runs, kpis, generatedAt } = await getDashboardData();

  return (
    <main className="main">
      <header className="page-header">
        <h1>Retentiond Overview</h1>
        <p>Generated at {new Date(generatedAt).toLocaleString()}</p>
      </header>

      <section>
        <h2>Upcoming Expirations</h2>
        {renderUpcomingTable(runs)}
      </section>

      <section>
        <h2>Deletion KPIs</h2>
        <div className="metrics-grid">
          {kpis.length ? (
            kpis.map(policy => (
              <KpiCard
                key={policy.policy}
                policy={policy.policy}
                cutoff={policy.cutoff}
                dryRun={policy.dryRun}
                totals={policy.targets.map(target => ({
                  type: target.type,
                  identifier: target.identifier,
                  expired: target.expired,
                  deleted: target.deleted
                }))}
              />
            ))
          ) : (
            <div className="empty-state">No KPIs available yet.</div>
          )}
        </div>
      </section>

      <footer>Retentiond monitors storage TTLs and produces verifiable deletion receipts.</footer>
    </main>
  );
}
