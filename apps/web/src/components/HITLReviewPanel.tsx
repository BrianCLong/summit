import React, { useState } from 'react';

interface HITLReviewPanelProps {
  taskId: string;
  workflowId: string;
  data: any; // Data to be reviewed
  onDecision: (taskId: string, decision: 'approved' | 'rejected', reason?: string) => void;
}

export const HITLReviewPanel: React.FC<HITLReviewPanelProps> = ({ taskId, workflowId, data, onDecision }) => {
  const [decision, setDecision] = useState<'approved' | 'rejected' | undefined>(undefined);
  const [reason, setReason] = useState<string>('');

  const handleSubmit = () => {
    if (decision) {
      onDecision(taskId, decision, reason);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-md">
      <h3 className="text-lg font-semibold">Review Task: {taskId}</h3>
      <p className="text-sm text-gray-600">Workflow: {workflowId}</p>
      <div className="mt-4 p-3 bg-gray-100 rounded-md">
        <pre className="text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">Decision:</label>
        <select
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          value={decision || ''}
          onChange={(e) => setDecision(e.target.value as 'approved' | 'rejected')}
        >
          <option value="">Select a decision</option>
          <option value="approved">Approve</option>
          <option value="rejected">Reject</option>
        </select>
      </div>
      {decision === 'rejected' && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Reason for Rejection:</label>
          <textarea
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          ></textarea>
        </div>
      )}
      <div className="mt-4">
        <button
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          onClick={handleSubmit}
          disabled={!decision}
        >
          Submit Decision
        </button>
      </div>
    </div>
  );
};