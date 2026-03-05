import React, { useEffect, useState } from 'react';
import { Approval, getPendingApprovals, approveRequest, rejectRequest } from '../api';
import { ApprovalCard } from './ApprovalCard';

export function TaskFeed() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovals = async () => {
    try {
      const data = await getPendingApprovals();
      setApprovals(data);
      setError(null);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await approveRequest(id);
      fetchApprovals(); // Refresh immediately
    } catch (err: any) {
      alert(`Error approving: ${err.message}`);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;
    try {
      await rejectRequest(id, reason);
      fetchApprovals(); // Refresh immediately
    } catch (err: any) {
      alert(`Error rejecting: ${err.message}`);
    }
  };

  if (loading && approvals.length === 0) return <div>Loading approvals...</div>;
  if (error) return <div style={{ color: 'red', padding: '20px' }}>Error loading approvals: {error}</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2>Pending Approvals ({approvals.length})</h2>
      {approvals.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666' }}>No pending approvals.</p>
      ) : (
        approvals.map(app => (
          <ApprovalCard
            key={app.id}
            approval={app}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))
      )}
    </div>
  );
}
