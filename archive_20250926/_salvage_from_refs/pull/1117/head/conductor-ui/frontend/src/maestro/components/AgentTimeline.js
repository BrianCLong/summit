import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { api } from '../api';
export default function AgentTimeline({ runId }) {
  const { getAgentSteps, streamAgent, actOnAgent } = api();
  const [steps, setSteps] = useState([]);
  useEffect(() => {
    let off = () => {};
    (async () => {
      try {
        const r = await getAgentSteps(runId);
        setSteps(r.steps || []);
      } catch {}
      off = streamAgent(runId, (s) =>
        setSteps((x) => {
          const nx = x.filter((y) => y.id !== s.id);
          return [...nx, s];
        }),
      );
    })();
    return () => off();
  }, [runId]);
  return _jsxs('section', {
    className: 'rounded-2xl border p-4 space-y-2',
    'aria-label': 'Agent timeline',
    children: [
      steps
        .sort((a, b) => a.ts - b.ts)
        .map((s) =>
          _jsxs(
            'div',
            {
              className: 'rounded border p-3',
              children: [
                _jsxs('div', {
                  className: 'flex items-center justify-between',
                  children: [
                    _jsx('div', { className: 'text-sm text-gray-500', children: s.role }),
                    _jsx('span', {
                      className: `text-xs px-2 py-0.5 rounded text-white ${s.state === 'approved' ? 'bg-emerald-600' : s.state === 'blocked' ? 'bg-red-600' : s.state === 'need_approval' ? 'bg-amber-500' : 'bg-slate-500'}`,
                      children: s.state,
                    }),
                  ],
                }),
                _jsx('pre', { className: 'whitespace-pre-wrap text-sm', children: s.text }),
                s.state === 'need_approval' &&
                  _jsxs('div', {
                    className: 'mt-2 flex gap-2',
                    children: [
                      _jsx('button', {
                        className: 'rounded bg-emerald-600 px-2 py-1 text-white',
                        onClick: () => actOnAgent(runId, { stepId: s.id, action: 'approve' }),
                        children: 'Approve',
                      }),
                      _jsx('button', {
                        className: 'rounded bg-red-600 px-2 py-1 text-white',
                        onClick: () => actOnAgent(runId, { stepId: s.id, action: 'block' }),
                        children: 'Block',
                      }),
                      _jsx('button', {
                        className: 'rounded border px-2 py-1',
                        onClick: async () => {
                          const patch = prompt('Edit step text', s.text) || s.text;
                          await actOnAgent(runId, { stepId: s.id, action: 'edit', patch });
                        },
                        children: 'Edit & approve',
                      }),
                    ],
                  }),
              ],
            },
            s.id,
          ),
        ),
      !steps.length &&
        _jsx('div', { className: 'text-sm text-gray-500', children: 'No agent steps yet' }),
    ],
  });
}
