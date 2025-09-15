
// conductor-ui/frontend/src/views/HumanInLoopDashboard.tsx
import React, { useState, useEffect } from 'react';
import { DecisionReviewQueue } from '../../../services/human-in-loop/decision-review-queue';
import { InterventionApi } from '../../../services/human-in-loop/intervention-api';

// Mock instances
const reviewQueue = new DecisionReviewQueue();
const interventionApi = new InterventionApi();

export const HumanInLoopDashboard = () => {
  const [pendingDecisions, setPendingDecisions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDecisions = async () => {
    setIsLoading(true);
    const decisions = await reviewQueue.getPendingDecisions();
    setPendingDecisions(decisions);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDecisions();
  }, []);

  const handleApprove = async (decisionId: string) => {
    await interventionApi.approveDecision(decisionId, 'current-human-user');
    fetchDecisions(); // Refresh list
  };

  const handleReject = async (decisionId: string) => {
    const reason = prompt('Reason for rejection:');
    if (reason) {
      await interventionApi.rejectDecision(decisionId, 'current-human-user', reason);
      fetchDecisions(); // Refresh list
    }
  };

  return (
    <div>
      <h1>Human-in-the-Loop Dashboard</h1>
      <h2>Decisions Awaiting Review</h2>
      {isLoading ? (
        <p>Loading decisions...</p>
      ) : pendingDecisions.length === 0 ? (
        <p>No decisions currently awaiting review. All systems go!</p>
      ) : (
        <ul>
          {pendingDecisions.map(decision => (
            <li key={decision.id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
              <p><strong>Type:</strong> {decision.type}</p>
              <p><strong>Risk:</strong> {decision.risk}</p>
              <p><strong>Details:</strong> {JSON.stringify(decision.details)}</p>
              <button onClick={() => handleApprove(decision.id)}>Approve</button>
              <button onClick={() => handleReject(decision.id)}>Reject</button>
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => reviewQueue.addDecision({ type: 'deployment', risk: 'medium', details: { version: '2.0.1', target: 'prod' } })}>Add Mock Decision</button>
    </div>
  );
};
