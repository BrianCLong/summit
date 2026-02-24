import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface HITLReviewPanelProps {
  taskId: string;
  workflowId: string;
  data: any; // Data to be reviewed
  onDecision: (taskId: string, decision: 'approved' | 'rejected', reason?: string) => void;
  isSubmitting?: boolean;
}

export const HITLReviewPanel: React.FC<HITLReviewPanelProps> = ({ taskId, workflowId, data, onDecision, isSubmitting }) => {
  const [decision, setDecision] = useState<'approved' | 'rejected' | undefined>(undefined);
  const [reason, setReason] = useState<string>('');

  const handleSubmit = () => {
    if (decision) {
      onDecision(taskId, decision, reason);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-md bg-card text-card-foreground">
      <h3 className="text-lg font-semibold">Review Task: {taskId}</h3>
      <p className="text-sm text-muted-foreground">Workflow: {workflowId}</p>
      <div
        className="mt-4 p-3 bg-muted rounded-md"
        role="region"
        aria-label="Task Data"
      >
        <pre className="text-xs overflow-auto font-mono text-muted-foreground">{JSON.stringify(data, null, 2)}</pre>
      </div>
      <div className="mt-4 space-y-2">
        <Label htmlFor={`decision-${taskId}`}>Decision</Label>
        <select
          id={`decision-${taskId}`}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          )}
          value={decision || ''}
          onChange={(e) => setDecision(e.target.value as 'approved' | 'rejected')}
        >
          <option value="">Select a decision</option>
          <option value="approved">Approve</option>
          <option value="rejected">Reject</option>
        </select>
      </div>
      {decision === 'rejected' && (
        <div className="mt-4 space-y-2">
          <Label htmlFor={`reason-${taskId}`}>Reason for Rejection</Label>
          <Textarea
            id={`reason-${taskId}`}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide a reason for rejecting this task..."
          />
        </div>
      )}
      <div className="mt-6">
        <Button
          onClick={handleSubmit}
          disabled={!decision || isSubmitting}
          loading={isSubmitting}
          className="w-full sm:w-auto"
        >
          Submit Decision
        </Button>
      </div>
    </div>
  );
};
