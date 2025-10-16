import React from 'react';
import { gql, useSubscription } from '@apollo/client';

const SUB = gql`
  subscription AlertStream($caseId: ID!) {
    alertStream(caseId: $caseId) {
      id
      caseId
      nodeIds
      severity
      kind
      reason
      ts
    }
  }
`;

export const AlertsPanel: React.FC<{ caseId: string }> = ({ caseId }) => {
  const { data } = useSubscription(SUB, { variables: { caseId } });
  const a = data?.alertStream;
  return (
    <div className="p-3 border rounded-xl">
      <div className="font-semibold mb-2">Live Alerts</div>
      {a ? (
        <div
          className="p-2 mb-2 rounded-md border alert-item"
          data-nodes={a.nodeIds.join(',')}
        >
          <div className="text-sm">
            {a.kind} • {a.severity}
          </div>
          <div className="text-xs opacity-70">{a.reason}</div>
        </div>
      ) : (
        <div className="text-xs opacity-60">Listening…</div>
      )}
    </div>
  );
};
