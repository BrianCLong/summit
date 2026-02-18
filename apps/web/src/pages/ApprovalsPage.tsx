import React, { useState } from 'react';
import { Check, X, Clock, FileText, Shield, AlertTriangle } from 'lucide-react';

// Mock Data
const MOCK_REQUESTS = [
  {
    id: 'REQ-101',
    requestor: 'alice@example.com',
    action: 'deploy:production',
    resource: 'service-payment',
    status: 'pending',
    created_at: '2026-02-12T10:30:00Z',
    risk: 'high',
    policy_check: 'require_approval'
  },
  {
    id: 'REQ-102',
    requestor: 'bob@example.com',
    action: 'delete:database',
    resource: 'db-users-replica',
    status: 'pending',
    created_at: '2026-02-12T11:15:00Z',
    risk: 'critical',
    policy_check: 'require_approval'
  },
  {
    id: 'REQ-103',
    requestor: 'charlie@example.com',
    action: 'read:audit-logs',
    resource: 'logs-2025',
    status: 'approved',
    created_at: '2026-02-11T09:00:00Z',
    risk: 'low',
    policy_check: 'allow'
  }
];

const checkPreflight = async (action: string) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));

  if (action.includes('delete')) {
     return { allow: false, reason: 'Deletion of critical resources is restricted by policy "No-Data-Loss".' };
  }
  return { allow: true, reason: 'Action permitted by policy "Standard-Change-Control".' };
}

export default function ApprovalsPage() {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rationale, setRationale] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'deny' | null>(null);
  const [preflightResult, setPreflightResult] = useState<{allow: boolean, reason: string} | null>(null);
  const [loadingPreflight, setLoadingPreflight] = useState(false);

  const handleAction = async (request: any, type: 'approve' | 'deny') => {
    setSelectedRequest(request);
    setActionType(type);
    setRationale('');
    setPreflightResult(null);

    if (type === 'approve') {
       setLoadingPreflight(true);
       try {
         const result = await checkPreflight(request.action);
         setPreflightResult(result);
       } finally {
         setLoadingPreflight(false);
       }
    }
  };

  const submitDecision = () => {
    if (!rationale) return;
    console.log(`Submitted ${actionType} for ${selectedRequest.id} with rationale: ${rationale}`);
    setSelectedRequest(null);
    setActionType(null);
    alert(`Request ${actionType}d!`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Approvals Center</h1>
          <p className="text-muted-foreground mt-1">Review and manage privileged access requests.</p>
        </div>
        <div className="flex gap-2">
           <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
             {MOCK_REQUESTS.filter(r => r.status === 'pending').length} Pending
           </span>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-lg border shadow-sm">
        <div className="grid grid-cols-6 gap-4 p-4 border-b bg-zinc-50 dark:bg-zinc-800/50 font-medium text-sm">
          <div className="col-span-1">ID</div>
          <div className="col-span-1">Requestor</div>
          <div className="col-span-1">Action</div>
          <div className="col-span-1">Risk</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {MOCK_REQUESTS.map((req) => (
          <div key={req.id} className="grid grid-cols-6 gap-4 p-4 border-b last:border-0 items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
            <div className="font-mono text-sm">{req.id}</div>
            <div className="text-sm truncate">{req.requestor}</div>
            <div className="text-sm font-medium">{req.action}</div>
            <div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                req.risk === 'critical' ? 'bg-red-100 text-red-800' :
                req.risk === 'high' ? 'bg-orange-100 text-orange-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {req.risk.toUpperCase()}
              </span>
            </div>
            <div>
              {req.status === 'pending' ? (
                <span className="inline-flex items-center text-yellow-600 text-sm">
                  <Clock className="w-4 h-4 mr-1" /> Pending
                </span>
              ) : (
                <span className="inline-flex items-center text-green-600 text-sm">
                  <Check className="w-4 h-4 mr-1" /> Approved
                </span>
              )}
            </div>
            <div className="flex justify-end gap-2">
              {req.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleAction(req, 'deny')}
                    className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-colors"
                    title="Deny"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleAction(req, 'approve')}
                    className="p-1.5 hover:bg-green-100 text-green-600 rounded transition-colors"
                    title="Approve"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </>
              )}
              <button className="p-1.5 hover:bg-zinc-100 text-zinc-600 rounded transition-colors" title="View Evidence">
                <FileText className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Decision Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
             <h2 className="text-lg font-bold mb-2 flex items-center">
               {actionType === 'approve' ? <Shield className="mr-2 text-green-600" /> : <Shield className="mr-2 text-red-600" />}
               {actionType === 'approve' ? 'Approve Request' : 'Deny Request'}
             </h2>

             {/* Preflight Check Result */}
             {actionType === 'approve' && (
               <div className="mb-4">
                 {loadingPreflight ? (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border-2 border-current border-r-transparent animate-spin" />
                      Running Policy Preflight...
                    </div>
                 ) : preflightResult ? (
                    <div className={`p-3 rounded-md text-sm border flex items-start gap-2 ${
                      preflightResult.allow ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                       {preflightResult.allow ? <Check className="w-4 h-4 mt-0.5" /> : <AlertTriangle className="w-4 h-4 mt-0.5" />}
                       <div>
                         <span className="font-semibold block">{preflightResult.allow ? 'Policy Check Passed' : 'Policy Warning'}</span>
                         {preflightResult.reason}
                       </div>
                    </div>
                 ) : null}
               </div>
             )}

             <p className="text-sm text-muted-foreground mb-4">
               You are about to {actionType} request <strong>{selectedRequest.id}</strong>.
               Please provide a rationale for this decision.
             </p>

             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium mb-1">Rationale (Required)</label>
                 <textarea
                   className="w-full border rounded-md p-2 text-sm min-h-[100px] bg-transparent focus:ring-2 focus:ring-blue-500 outline-none"
                   placeholder="E.g., Verified ticket #1234, changes are compliant..."
                   value={rationale}
                   onChange={(e) => setRationale(e.target.value)}
                   autoFocus
                 />
               </div>

               <div className="flex justify-end gap-2 mt-6">
                 <button
                   onClick={() => { setSelectedRequest(null); setActionType(null); }}
                   className="px-4 py-2 text-sm border rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={submitDecision}
                   disabled={!rationale.trim() || (actionType === 'approve' && loadingPreflight)}
                   className={`px-4 py-2 text-sm rounded-md text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                     actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                   }`}
                 >
                   Confirm {actionType === 'approve' ? 'Approval' : 'Denial'}
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
