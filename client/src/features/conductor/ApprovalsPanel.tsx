import React, { useEffect, useState } from 'react';
import $ from 'jquery';

interface ApprovalTask {
  runId: string;
  stepId: string;
  labels: string[];
}

export default function ApprovalsPanel() {
  const [tasks, setTasks] = useState<ApprovalTask[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch('/api/conductor/v1/approvals');
        const j = await r.json();
        if (alive) setTasks(j.items || []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
    const iv = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    $(document).on('input', '#approval-filter', function () {
      const q = ($(this).val()?.toString().toLowerCase() as string) || '';
      $('.approval-row').each(function () {
        $(this).toggle($(this).text().toLowerCase().indexOf(q) >= 0);
      });
    });
    return () => {
      $(document).off('input', '#approval-filter');
    };
  }, []);

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Approvals</h3>
        <input
          id="approval-filter"
          style={{
            border: '1px solid #ddd',
            borderRadius: 6,
            padding: '4px 8px',
          }}
          placeholder="filter…"
        />
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tasks.map((t) => (
          <li
            key={t.runId + t.stepId}
            className="approval-row"
            style={{ display: 'flex', gap: 8, padding: '6px 0' }}
          >
            <div style={{ flexGrow: 1 }}>
              Run {t.runId} • Step {t.stepId} • {(t.labels || []).join(', ')}
            </div>
            <button
              onClick={() => approve(t, true)}
              style={{ padding: '4px 8px', borderRadius: 16 }}
            >
              Approve
            </button>
            <button
              onClick={() => approve(t, false)}
              style={{ padding: '4px 8px', borderRadius: 16 }}
            >
              Decline
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  async function approve(t: ApprovalTask, ok: boolean) {
    const justification = window.prompt(
      ok ? 'Approval justification' : 'Decline justification',
    );
    if (!justification) return;
    const m = ok ? 'approveStep' : 'declineStep';
    const q = `mutation($runId:ID!,$stepId:ID!,$j:String!){ ${m}(runId:$runId, stepId:$stepId, justification:$j) }`;
    try {
      await fetch('/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query: q,
          variables: { runId: t.runId, stepId: t.stepId, j: justification },
        }),
      });
    } catch (e) {
      console.error(e);
    }
  }
}
