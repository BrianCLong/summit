"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Page;
require("./globals.css");
require("../styles/dashboard.css");
const KpiCard_1 = require("../components/KpiCard");
const BASE_URL = process.env.NEXT_PUBLIC_RETENTIOND_URL ?? 'http://localhost:8088';
async function fetchJSON(path) {
    try {
        const res = await fetch(`${BASE_URL}${path}`, { cache: 'no-store' });
        if (!res.ok) {
            return null;
        }
        return (await res.json());
    }
    catch (error) {
        console.warn(`Failed to fetch ${path}`, error);
        return null;
    }
}
async function getDashboardData() {
    const [runs, kpis] = await Promise.all([
        fetchJSON('/metrics/runs'),
        fetchJSON('/metrics/kpis')
    ]);
    return {
        generatedAt: runs?.generatedAt ?? new Date().toISOString(),
        runs: runs?.runs ?? [],
        kpis: kpis?.policies ?? []
    };
}
function renderUpcomingTable(runs) {
    if (!runs.length) {
        return <div className="empty-state">No recent retention sweeps recorded.</div>;
    }
    const rows = runs.flatMap(run => run.targets.map(target => ({
        policy: run.policy,
        target: target.identifier,
        type: target.type,
        cutoff: run.cutoff,
        expired: target.expired.length,
        dryRun: run.dryRun
    })));
    return (<div className="table-wrapper" role="region" aria-label="Upcoming expirations">
      <table className="expirations-table">
        <thead>
          <tr>
            <th scope="col">Policy</th>
            <th scope="col">Target</th>
            <th scope="col">Type</th>
            <th scope="col">Expired Items</th>
            <th scope="col">Cutoff</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (<tr key={`${row.policy}-${row.target}`}>
              <td data-label="Policy">{row.policy}</td>
              <td data-label="Target">{row.target}</td>
              <td data-label="Type">{row.type}</td>
              <td data-label="Expired Items">{row.expired}</td>
              <td data-label="Cutoff">{new Date(row.cutoff).toLocaleString()}</td>
              <td data-label="Status">{row.dryRun ? 'Dry Run' : 'Deleted'}</td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
async function Page() {
    const { runs, kpis, generatedAt } = await getDashboardData();
    return (<main className="main">
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
          {kpis.length ? (kpis.map(policy => (<KpiCard_1.KpiCard key={policy.policy} policy={policy.policy} cutoff={policy.cutoff} dryRun={policy.dryRun} totals={policy.targets.map(target => ({
                type: target.type,
                identifier: target.identifier,
                expired: target.expired,
                deleted: target.deleted
            }))}/>))) : (<div className="empty-state">No KPIs available yet.</div>)}
        </div>
      </section>

      <footer>Retentiond monitors storage TTLs and produces verifiable deletion receipts.</footer>
    </main>);
}
