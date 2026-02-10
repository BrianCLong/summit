import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ReceiptPanel } from '@/components/switchboard/ReceiptPanel';
import { PolicyExplanationPanel } from '@/components/switchboard/PolicyExplanationPanel';

interface ApprovalDetail {
  id: string;
  requester_id: string;
  status: string;
  action: string;
  created_at: string;
  payload?: any;
  reason?: string;
  approver_id?: string;
  decision_reason?: string;
  updated_at?: string;
}

export const ApprovalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [approval, setApproval] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [rationale, setRationale] = useState('');
  const [receipt, setReceipt] = useState<any>(null);
  const [error, setError] = useState('');

  // Simulation state
  const [policyDecision, setPolicyDecision] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/approvals/${id}`)
      .then(res => res.json())
      .then(data => {
        setApproval(data);
        setLoading(false);
        // Simulate policy check automatically? Or fetching existing simulation result?
        // Ideally fetch from payload if stored.
        if (data.payload?.policyDecision) {
            setPolicyDecision(data.payload.policyDecision);
        } else {
             // For MVP, simplistic simulation or assume allow
             setPolicyDecision({ allow: true, reason: 'Manual simulation not implemented in UI yet.' });
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  const handleDecision = async (decision: 'approve' | 'reject') => {
    if (!rationale) {
        setError('Rationale is required.');
        return;
    }
    setError('');

    try {
        const res = await fetch(`/api/approvals/${id}/${decision}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: rationale })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed');
        }

        const result = await res.json();
        setApproval(result.approval);
        setReceipt(result.receipt); // Display new receipt
    } catch (e: any) {
        setError(e.message);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!approval) return <div className="p-8">Not found.</div>;

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Approval Request</h1>
        <Badge variant={approval.status === 'pending' ? 'outline' : 'secondary'}>
          {approval.status}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
             <Card>
                 <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <div className="text-sm font-medium text-muted-foreground">Action</div>
                             <div>{approval.action}</div>
                         </div>
                         <div>
                             <div className="text-sm font-medium text-muted-foreground">Requester</div>
                             <div>{approval.requester_id}</div>
                         </div>
                     </div>
                     <div>
                         <div className="text-sm font-medium text-muted-foreground">Payload</div>
                         <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40">
                             {JSON.stringify(approval.payload, null, 2)}
                         </pre>
                     </div>
                     {approval.reason && (
                         <div className="bg-yellow-50/10 p-4 border rounded">
                             <div className="text-sm font-medium text-muted-foreground">Request Reason</div>
                             <div className="italic">"{approval.reason}"</div>
                         </div>
                     )}
                 </CardContent>
             </Card>

             {/* Policy Simulation */}
             {policyDecision && <PolicyExplanationPanel decision={policyDecision} />}

             {/* Decision Receipt */}
             {receipt && <ReceiptPanel receipt={receipt} />}

        </div>

        <div className="space-y-6">
             {approval.status === 'pending' ? (
                 <Card>
                     <CardHeader><CardTitle>Take Action</CardTitle></CardHeader>
                     <CardContent className="space-y-4">
                         {error && <div className="text-red-500 text-sm">{error}</div>}
                         <textarea
                             className="w-full border rounded p-2 text-sm bg-background"
                             placeholder="Required rationale..."
                             rows={4}
                             value={rationale}
                             onChange={e => setRationale(e.target.value)}
                         />
                         <div className="flex gap-2">
                             <Button
                                 className="flex-1 bg-green-600 hover:bg-green-700"
                                 onClick={() => handleDecision('approve')}
                                 disabled={policyDecision && !policyDecision.allow}
                             >
                                 Approve
                             </Button>
                             <Button
                                 className="flex-1 bg-red-600 hover:bg-red-700"
                                 onClick={() => handleDecision('reject')}
                             >
                                 Reject
                             </Button>
                         </div>
                         {policyDecision && !policyDecision.allow && (
                             <div className="text-xs text-red-500 text-center">
                                 Warning: Policy denies this action.
                             </div>
                         )}
                     </CardContent>
                 </Card>
             ) : (
                 <Card>
                     <CardHeader><CardTitle>Decision Record</CardTitle></CardHeader>
                     <CardContent className="space-y-2 text-sm">
                         <div><span className="text-muted-foreground">Decided by:</span> {approval.approver_id}</div>
                         <div><span className="text-muted-foreground">Reason:</span> "{approval.decision_reason}"</div>
                         <div><span className="text-muted-foreground">Date:</span> {new Date(approval.updated_at || '').toLocaleString()}</div>
                     </CardContent>
                 </Card>
             )}

             <Button variant="outline" className="w-full" onClick={() => navigate('/switchboard/incidents/new?approvalId=' + approval.id)}>
                 ⚠ Open Incident
             </Button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalDetailPage;
