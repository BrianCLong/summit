import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface RunbookStep {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  sequence_order: number;
}

interface IncidentDetail {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  steps?: RunbookStep[];
  provenance_chain_id?: string;
}

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // New incident creation logic if id === 'new'
  const isNew = id === 'new';
  const approvalId = searchParams.get('approvalId');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSeverity, setNewSeverity] = useState('medium');

  useEffect(() => {
    if (isNew) {
        setLoading(false);
        return;
    }

    if (id) {
        fetch(`/api/incidents/${id}`)
        .then(res => res.json())
        .then(data => {
            setIncident(data);
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setLoading(false);
        });
    }
  }, [id, isNew]);

  const handleCreate = async () => {
      try {
          const res = await fetch('/api/incidents', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  title: newTitle,
                  description: newDesc,
                  severity: newSeverity,
                  provenanceChainId: approvalId, // Link to approval
                  runbookId: 'default' // Default runbook
              })
          });
          if (res.ok) {
              const data = await res.json();
              window.location.href = `/switchboard/incidents/${data.id}`;
          }
      } catch (e) {
          console.error(e);
      }
  };

  const executeStep = async (stepId: string) => {
      if (!incident) return;
      try {
          const res = await fetch(`/api/incidents/${incident.id}/runbook/step/${stepId}/execute`, {
              method: 'POST'
          });
          if (res.ok) {
              const updatedStep = await res.json();
              setIncident(prev => {
                  if (!prev) return null;
                  return {
                      ...prev,
                      steps: prev.steps?.map(s => s.id === stepId ? updatedStep : s)
                  };
              });
          }
      } catch (e) {
          console.error(e);
      }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  if (isNew) {
      return (
          <div className="p-8 max-w-2xl mx-auto space-y-6">
              <h1 className="text-2xl font-bold">Create Incident</h1>
              <Card>
                  <CardContent className="space-y-4 pt-6">
                      <div>
                          <label className="block text-sm font-medium mb-1">Title</label>
                          <input className="w-full border rounded p-2" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1">Description</label>
                          <textarea className="w-full border rounded p-2" rows={3} value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1">Severity</label>
                          <select className="w-full border rounded p-2" value={newSeverity} onChange={e => setNewSeverity(e.target.value)}>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                          </select>
                      </div>
                      {approvalId && (
                          <div className="text-sm text-muted-foreground">
                              Linked to Approval ID: {approvalId}
                          </div>
                      )}
                      <Button onClick={handleCreate} disabled={!newTitle}>Create Incident</Button>
                  </CardContent>
              </Card>
          </div>
      );
  }

  if (!incident) return <div className="p-8">Not found.</div>;

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">{incident.title}</h1>
            <p className="text-muted-foreground">{incident.description}</p>
        </div>
        <div className="flex gap-2">
            <Badge variant="outline">{incident.severity.toUpperCase()}</Badge>
            <Badge variant={incident.status === 'open' ? 'destructive' : 'secondary'}>{incident.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
              <h2 className="text-lg font-semibold">Runbook Execution</h2>
              <div className="space-y-4">
                  {incident.steps?.map((step, idx) => (
                      <Card key={step.id} className={step.status === 'completed' ? 'opacity-75' : ''}>
                          <CardHeader className="py-4">
                              <CardTitle className="text-sm flex justify-between items-center">
                                  <span>{idx + 1}. {step.title}</span>
                                  <Badge variant={step.status === 'completed' ? 'secondary' : 'default'}>{step.status}</Badge>
                              </CardTitle>
                          </CardHeader>
                          <CardContent className="pb-4 text-sm space-y-2">
                              <p>{step.description}</p>
                              {step.status !== 'completed' && (
                                  <Button size="sm" onClick={() => executeStep(step.id)}>
                                      {step.type === 'automated' ? 'Trigger Automation' : 'Mark Complete'}
                                  </Button>
                              )}
                          </CardContent>
                      </Card>
                  ))}
              </div>
          </div>

          <div className="space-y-6">
              <Card>
                  <CardHeader><CardTitle>Metadata</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-2">
                      <div><span className="font-semibold">ID:</span> {incident.id}</div>
                      <div><span className="font-semibold">Created:</span> {new Date(incident.created_at).toLocaleString()}</div>
                      {incident.provenance_chain_id && (
                          <div><span className="font-semibold">Provenance Chain:</span> {incident.provenance_chain_id}</div>
                      )}
                  </CardContent>
              </Card>
          </div>
      </div>
    </div>
  );
};

export default IncidentDetailPage;
