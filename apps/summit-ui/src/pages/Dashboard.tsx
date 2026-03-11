import { useEffect, useState } from 'react';
import { getDashboard } from '../api';
import type { DashboardData } from '../types';
import { TopFindings } from '../components/TopFindings';
import { KnowledgeGraph } from '../components/KnowledgeGraph';

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={accent ? { color: accent } : undefined}>{value}</span>
    </div>
  );
}

function BranchTypeRow({ type, count }: { type: string; count: number }) {
  const colors: Record<string, string> = {
    feature: '#3fb950', fix: '#f85149', claude: '#58a6ff', other: '#8b949e',
  };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(48,54,61,.4)' }}>
      <span style={{ color: colors[type] ?? 'var(--text-muted)', fontSize: 12 }}>{type}/</span>
      <span style={{ fontWeight: 600 }}>{count}</span>
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading" role="status" aria-busy="true">Loading dashboard…</div>;
  if (error)   return <div className="empty"><span className="empty-icon">⚠</span><span>{error}</span></div>;
  if (!data)   return null;

  const { branches, tags, artifacts } = data;
  const mergedCount = artifacts.byStatus['merged'] ?? 0;
  const openCount   = branches.total;

  return (
    <div>
      <h1 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--text)' }}>
        Convergence Dashboard
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 12 }}>
          as of {new Date(data.generatedAt).toLocaleString()}
        </span>
      </h1>

      {/* ── Summary stats ── */}
      <div className="grid-4">
        <StatCard label="Branches" value={branches.total} />
        <StatCard label="Tags" value={tags.total} />
        <StatCard label="PR Artifacts" value={artifacts.total} />
        <StatCard label="Merged" value={mergedCount} accent="var(--green)" />
      </div>

      <div className="grid-2">
        {/* ── Branch breakdown ── */}
        <div className="card">
          <div className="card-title">Branches by type</div>
          {Object.entries(branches.byType).map(([type, count]) => (
            <BranchTypeRow key={type} type={type} count={count} />
          ))}
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            {openCount} unique branch(es) total · {tags.total} tag(s)
          </div>
        </div>

        {/* ── Artifact status breakdown ── */}
        <div className="card">
          <div className="card-title">Artifact status</div>
          {Object.entries(artifacts.byStatus).length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No artifacts found</span>
          ) : (
            Object.entries(artifacts.byStatus).map(([status, count]) => (
              <div key={status} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(48,54,61,.4)', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>{status}</span>
                <span style={{ fontWeight: 600 }}>{count}</span>
              </div>
            ))
          )}
          {artifacts.recentConcerns.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>Recent concerns</div>
              {artifacts.recentConcerns.map((c) => (
                <span key={c} style={{ display: 'inline-block', margin: '2px 3px', padding: '1px 7px', background: 'var(--surface-2)', borderRadius: 10, fontSize: 11, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{c}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Top Findings ── */}
      <div className="card">
        <div className="card-title">Top findings</div>
        <TopFindings findings={data.topFindings} />
      </div>

      {/* ── Recent tags ── */}
      {tags.list.length > 0 && (
        <div className="card">
          <div className="card-title">Recent tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.list.slice(0, 20).map((t) => (
              <span key={t} style={{ padding: '2px 10px', background: 'var(--surface-2)', borderRadius: 10, fontSize: 11, border: '1px solid var(--border)', color: 'var(--text)' }}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Knowledge Graph ── */}
      <div className="card">
        <div className="card-title">Knowledge Graph</div>
        <KnowledgeGraph
          width={800}
          height={400}
          nodes={[
            { id: 'Agent-1', group: 1 },
            { id: 'Agent-2', group: 1 },
            { id: 'Task-A', group: 2 },
            { id: 'Task-B', group: 2 },
          ]}
          links={[
            { source: 'Agent-1', target: 'Task-A', value: 1 },
            { source: 'Agent-2', target: 'Task-B', value: 2 },
            { source: 'Agent-1', target: 'Task-B', value: 1 },
          ]}
        />
      </div>
    </div>
  );
}
