import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  created_at: string;
}

export const IncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/incidents')
      .then(res => res.json())
      .then(data => {
        setIncidents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading incidents...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Incident Hub</h1>
        <Button onClick={() => window.location.href='/switchboard/incidents/new'}>+ New Incident</Button>
      </div>

      <div className="grid gap-4">
        {incidents.length === 0 ? (
          <div className="text-muted-foreground">No active incidents.</div>
        ) : (
          incidents.map(incident => (
            <Link to={`/switchboard/incidents/${incident.id}`} key={incident.id}>
              <Card className="hover:bg-accent transition-colors cursor-pointer border-l-4" style={{
                  borderLeftColor: incident.severity === 'critical' ? 'red' :
                                   incident.severity === 'high' ? 'orange' :
                                   incident.severity === 'medium' ? 'yellow' : 'green'
              }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {incident.title}
                  </CardTitle>
                  <Badge variant={incident.status === 'open' ? 'destructive' : 'outline'}>
                    {incident.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    Severity: {incident.severity.toUpperCase()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(incident.created_at).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default IncidentsPage;
