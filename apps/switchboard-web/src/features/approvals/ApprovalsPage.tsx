import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApprovals, approveApproval, rejectApproval } from './api';
import { Approval } from './types';
import { TaskDetailView } from './TaskDetailView';

export const ApprovalsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: approvals, isLoading } = useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: () => fetchApprovals('pending'),
  });

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);

  const approveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => approveApproval(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      setProcessingId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectApproval(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      setProcessingId(null);
    },
  });

  const handleApprove = (id: string) => {
    setProcessingId(id);
    approveMutation.mutate({ id, reason: 'Approved by human operator via Switchboard' });
  };

  const handleReject = (id: string) => {
    const reason = window.prompt('Enter rejection reason:');
    if (reason !== null) {
      setProcessingId(id);
      rejectMutation.mutate({ id, reason });
    }
  };

  return (
    <div className="approvals-container">
      <div className="section-header">
        <h2>Task Inbox</h2>
        <p className="description">Review and authorize high-risk agent actions requiring human-in-the-loop validation.</p>
      </div>

      {isLoading ? (
        <div className="loading-state">Loading pending approvals...</div>
      ) : approvals?.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🛡️</div>
          <h3>All Clear</h3>
          <p>No agent tasks are currently awaiting approval. Your agents are operating within policy bounds.</p>
        </div>
      ) : (
        <div className="approvals-list">
          <table className="approvals-table">
            <thead>
              <tr>
                <th>Agent / Requester</th>
                <th>Action</th>
                <th>Risk Context</th>
                <th>Requested At</th>
                <th className="actions-col">Decision</th>
              </tr>
            </thead>
            <tbody>
              {approvals?.map((approval) => (
                <tr key={approval.id} className={processingId === approval.id ? 'row-processing' : ''}>
                  <td>
                    <div className="requester-info">
                      <span className="agent-badge">Agent</span>
                      <code>{approval.requester_id}</code>
                    </div>
                  </td>
                  <td>
                    <span className="action-tag">{approval.action?.replace('maestro_', '')}</span>
                  </td>
                  <td>
                    <div className="reason-text">{approval.reason}</div>
                    {approval.payload?.riskScore && (
                      <div className="risk-indicator">
                        Risk Score: <span className="score">{approval.payload.riskScore.toFixed(2)}</span>
                      </div>
                    )}
                  </td>
                  <td>{new Date(approval.created_at).toLocaleString()}</td>
                  <td className="actions-cell">
                    <button
                      className="btn-inspect"
                      onClick={() => setSelectedApproval(approval)}
                      disabled={!!processingId}
                    >
                      Inspect
                    </button>
                    <button
                      className="btn-approve"
                      onClick={() => handleApprove(approval.id)}
                      disabled={!!processingId}
                    >
                      Authorize
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => handleReject(approval.id)}
                      disabled={!!processingId}
                    >
                      Deny
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedApproval && (
        <TaskDetailView
          approval={selectedApproval}
          onClose={() => setSelectedApproval(null)}
        />
      )}

      <style>{`
        .approvals-container {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .section-header {
          margin-bottom: 2rem;
        }
        .section-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 0.5rem;
        }
        .description {
          color: #888;
        }
        .approvals-list {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
        }
        .approvals-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .approvals-table th {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          color: #aaa;
          font-weight: 500;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .approvals-table td {
          padding: 1.25rem 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          color: #ccc;
          vertical-align: top;
        }
        .agent-badge {
          font-size: 0.7rem;
          background: rgba(0, 120, 255, 0.2);
          color: #4da3ff;
          padding: 2px 6px;
          border-radius: 4px;
          margin-right: 0.5rem;
          text-transform: uppercase;
        }
        .action-tag {
          font-family: 'Fira Code', monospace;
          background: rgba(255, 255, 255, 0.1);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        .reason-text {
          font-size: 0.9rem;
          line-height: 1.4;
          margin-bottom: 0.5rem;
          max-width: 400px;
        }
        .risk-indicator {
          font-size: 0.8rem;
          color: #888;
        }
        .score {
          color: #ff4d4d;
          font-weight: 600;
        }
        .actions-cell {
          display: flex;
          gap: 0.75rem;
        }
        .btn-approve, .btn-reject, .btn-inspect {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        .btn-inspect {
          background: rgba(255, 255, 255, 0.08);
          color: #888;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .btn-inspect:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.3);
        }
        .btn-approve {
          background: #0078ff;
          color: white;
        }
        .btn-approve:hover:not(:disabled) {
          background: #0066da;
          box-shadow: 0 0 15px rgba(0, 120, 255, 0.4);
        }
        .btn-reject {
          background: transparent;
          border: 1px solid #ff4d4d;
          color: #ff4d4d;
        }
        .btn-reject:hover:not(:disabled) {
          background: rgba(255, 77, 77, 0.1);
        }
        .btn-approve:disabled, .btn-reject:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #666;
        }
        .empty-state .icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .row-processing {
          opacity: 0.6;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};
