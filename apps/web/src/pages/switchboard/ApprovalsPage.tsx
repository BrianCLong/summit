import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface Approval {
  id: string;
  requester_id: string;
  status: string;
  action: string;
  created_at: string;
  reason?: string;
  payload?: any;
}

export const ApprovalsPage: React.FC = () => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/approvals')
      .then(res => res.json())
      .then(data => {
        setApprovals(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading approvals...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Approvals Queue</h1>
        <Button>Filters</Button>
      </div>

      <div className="grid gap-4">
        {approvals.length === 0 ? (
          <div className="text-muted-foreground">No pending approvals.</div>
        ) : (
          approvals.map(approval => (
            <Link to={`/switchboard/approvals/${approval.id}`} key={approval.id}>
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {approval.action || 'Unknown Action'}
                  </CardTitle>
                  <Badge variant={approval.status === 'pending' ? 'outline' : 'secondary'}>
                    {approval.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    Requester: {approval.requester_id}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(approval.created_at).toLocaleString()}
                  </div>
                  {approval.reason && (
                    <div className="mt-2 text-sm italic">"{approval.reason}"</div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default ApprovalsPage;
