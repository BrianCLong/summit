import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

type RunRef = { id: string };
type DeploymentRef = { id: string };
type Ticket = {
  provider: 'github' | 'jira';
  external_id: string;
  title: string;
  assignee?: string | null;
  labels?: string[];
  project?: string | null;
  repo?: string | null;
  runs: RunRef[];
  deployments: DeploymentRef[];
};

export default function TicketDetails() {
  const { provider = '', externalId = '' } = useParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const q = `query($provider:String!,$id:String!){
        tickets(provider:$provider, external_id:$id, limit:1){
          provider external_id title assignee labels project repo
          runs{ id } deployments{ id }
        }
      }`;
      const r = await fetch('/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query: q,
          variables: { provider, id: externalId },
        }),
      });
      const j = await r.json();
      setTicket(j?.data?.tickets?.[0] ?? null);
      setLoading(false);
    })();
  }, [provider, externalId]);

  if (loading) return <div className="p-4">Loading…</div>;
  if (!ticket) return <div className="p-4">Not found.</div>;

  const title = encodeURIComponent(`[${ticket.provider}] ${ticket.title}`);
  const body = encodeURIComponent(
    `Linked Ticket: ${ticket.provider}:${ticket.external_id}\n` +
      `Assignee: ${ticket.assignee ?? '-'}\n` +
      `Runs: ${(ticket.runs || []).map((r) => r.id).join(', ') || '-'}\n` +
      `Deployments: ${(ticket.deployments || []).map((d) => d.id).join(', ') || '-'}\n`,
  );

  const githubNewIssueUrl = ticket.repo
    ? `https://github.com/${ticket.repo}/issues/new?title=${title}&body=${body}`
    : null;

  const jiraCreateUrl = ticket.project
    ? `${(import.meta as any).env.VITE_JIRA_BROWSE_URL || ''}/secure/CreateIssueDetails!init.jspa?pid=${ticket.project}&summary=${title}&description=${body}`
    : null;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{ticket.title}</h1>

      <section>
        <h2 className="text-lg font-medium mb-2">Links</h2>
        <div className="space-y-1">
          <div>
            <span className="font-mono">Provider:</span> {ticket.provider}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono">Ext ID:</span> {ticket.external_id}
            {ticket.provider === 'github' && ticket.repo && (
              <a
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                href={`https://github.com/${ticket.repo}/issues/${ticket.external_id}`}
                target="_blank"
                rel="noreferrer"
              >
                Open Issue/PR
              </a>
            )}
            {ticket.provider === 'jira' && ticket.project && (
              <a
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                href={`${(import.meta as any).env.VITE_JIRA_BROWSE_URL}/browse/${ticket.external_id}`}
                target="_blank"
                rel="noreferrer"
              >
                Open Issue/PR
              </a>
            )}
          </div>
          <div>
            <span className="font-mono">Assignee:</span>{' '}
            {ticket.assignee ?? '—'}
          </div>
          <div>
            <span className="font-mono">Labels:</span>{' '}
            {(ticket.labels || []).join(', ') || '—'}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Runs</h2>
        {(ticket.runs || []).length === 0 ? (
          <p className="text-gray-500">No runs linked to this ticket.</p>
        ) : (
          <ul className="space-y-2">
            {(ticket.runs || []).map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 p-2 border rounded"
              >
                <span className="font-mono text-sm">{r.id}</span>
                <div className="flex gap-2">
                  <Link
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    to={`/runs/viewer?runId=${r.id}`}
                  >
                    Open Run
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Deployments</h2>
        {(ticket.deployments || []).length === 0 ? (
          <p className="text-gray-500">No deployments linked to this ticket.</p>
        ) : (
          <ul className="space-y-2">
            {(ticket.deployments || []).map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-3 p-2 border rounded"
              >
                <span className="font-mono text-sm">{d.id}</span>
                <div className="flex gap-2">
                  <Link
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                    to={`/deployments/${d.id}`}
                  >
                    Open Deployment
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex gap-3">
        {githubNewIssueUrl && (
          <a
            className="px-3 py-2 rounded bg-black text-white"
            href={githubNewIssueUrl}
            target="_blank"
            rel="noreferrer"
          >
            Create GitHub Defect
          </a>
        )}
        {jiraCreateUrl && (
          <a
            className="px-3 py-2 rounded bg-blue-600 text-white"
            href={jiraCreateUrl}
            target="_blank"
            rel="noreferrer"
          >
            Create Jira Defect
          </a>
        )}
      </section>
    </div>
  );
}
