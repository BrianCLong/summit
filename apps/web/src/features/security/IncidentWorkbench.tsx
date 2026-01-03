import React from 'react';

type TimelineItem = {
  time: string;
  summary: string;
  evidence?: string;
};

type Playbook = {
  id: string;
  name: string;
  status: 'draft' | 'awaiting-approval' | 'approved';
  rationale: string;
};

const timeline: TimelineItem[] = [
  { time: '00:00', summary: 'Alert received: anomalous authentication', evidence: 'alert-123' },
  { time: '00:03', summary: 'Investigation agent enriched asset owner', evidence: 'identity-45' },
  { time: '00:05', summary: 'Containment plan drafted (recommendation only)' }
];

const hypotheses = [
  'Credential stuffing from suspicious IP range',
  'Potential token replay from shared workstation'
];

const playbooks: Playbook[] = [
  {
    id: 'pb-1',
    name: 'Reset affected credentials and revoke sessions',
    status: 'awaiting-approval',
    rationale: 'Limits blast radius while awaiting investigation close'
  },
  {
    id: 'pb-2',
    name: 'Isolate workstation via EDR network containment',
    status: 'draft',
    rationale: 'Requires CAB approval before execution'
  }
];

const approvals = [
  { id: 'app-1', role: 'security-admin', status: 'pending', scope: 'containment' },
  { id: 'app-2', role: 'incident-commander', status: 'not-requested', scope: 'rollback' }
];

const evidenceGraph = [
  'Alert -> Asset: laptop-23',
  'Finding -> Hypothesis: credential stuffing',
  'AgentAction -> PolicyDecision: read_advise'
];

export const IncidentWorkbench: React.FC = () => {
  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <header>
        <h2>Incident Workbench</h2>
        <p style={{ color: '#4b5563' }}>
          Read/Advise mode by default. Approvals required before any act step.
        </p>
      </header>

      <section>
        <h3>Timeline</h3>
        <ul>
          {timeline.map((item) => (
            <li key={item.time}>
              <strong>{item.time}</strong> — {item.summary}
              {item.evidence ? <em style={{ marginLeft: 8 }}>({item.evidence})</em> : null}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Evidence Graph</h3>
        <div style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: 8 }}>
          {evidenceGraph.map((edge) => (
            <div key={edge} style={{ marginBottom: 4 }}>
              {edge}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3>Hypotheses</h3>
        <ol>
          {hypotheses.map((hypothesis) => (
            <li key={hypothesis}>{hypothesis}</li>
          ))}
        </ol>
      </section>

      <section>
        <h3>Recommended Playbooks</h3>
        <ul>
          {playbooks.map((playbook) => (
            <li key={playbook.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  <strong>{playbook.name}</strong> — {playbook.rationale}
                </span>
                <span style={{ color: '#2563eb' }}>{playbook.status}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Approvals</h3>
        <ul>
          {approvals.map((approval) => (
            <li key={approval.id}>
              {approval.role} • scope: {approval.scope} • status: {approval.status}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
