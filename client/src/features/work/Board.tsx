import React from 'react';
import { Link } from 'react-router-dom';

type Ticket = {
  id: string;
  title: string;
  status: string;
  assignee?: string;
  provider?: 'github' | 'jira';
};

export default function WorkBoard() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [provider, setProvider] = React.useState<string>('');
  const [assignee, setAssignee] = React.useState<string>('');
  const [label, setLabel] = React.useState<string>('');
  const [project, setProject] = React.useState<string>('');
  const [repo, setRepo] = React.useState<string>('');

  const load = React.useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (provider) params.set('provider', provider);
    if (assignee) params.set('assignee', assignee);
    if (label) params.set('label', label);
    if (project) params.set('project', project);
    if (repo) params.set('repo', repo);
    fetch(`/api/tickets?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setTickets(data.items || []))
      .finally(() => setLoading(false));
  }, [provider, assignee, label, project, repo]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Work Board (GitHub + Jira)</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="">All</option>
          <option value="github">GitHub</option>
          <option value="jira">Jira</option>
        </select>
        <input
          placeholder="Assignee"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
        />
        <input
          placeholder="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          placeholder="Project"
          value={project}
          onChange={(e) => setProject(e.target.value)}
        />
        <input
          placeholder="Repo"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
        />
        <button onClick={load}>Filter</button>
      </div>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul>
          {tickets.map((t) => (
            <li key={`${t.provider}:${t.id}`}>
              <strong>[{t.provider ?? 'pm'}]</strong>{' '}
              <Link
                to={`/work/ticket?provider=${encodeURIComponent(t.provider || 'pm')}&id=${encodeURIComponent((t as any).external_id || t.id)}`}
              >
                {t.title}
              </Link>{' '}
              — {t.status} {t.assignee ? `· ${t.assignee}` : ''}
            </li>
          ))}
        </ul>
      )}
      {!loading && tickets.length === 0 && <p>No tickets yet.</p>}
    </div>
  );
}
