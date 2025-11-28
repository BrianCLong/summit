import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Incident {
    id: string;
    title: string;
    createdAt: string;
}

interface Evidence {
    id: string;
    labels: string[];
    properties: any;
}

export const InvestigationWorkbench: React.FC = () => {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
    const [evidence, setEvidence] = useState<Evidence[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch('/securiteyes/incidents', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        })
        .then(res => res.json())
        .then(data => setIncidents(data));
    }, []);

    const loadEvidence = async (incidentId: string) => {
        setLoading(true);
        setSelectedIncident(incidentId);
        try {
            const res = await fetch(`/securiteyes/incidents/${incidentId}/evidence`, {
                 method: 'POST',
                 headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
            const data = await res.json();
            setEvidence(data.evidence || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            <Card className="col-span-1">
                <CardHeader>
                    <CardTitle>Select Incident</CardTitle>
                </CardHeader>
                <CardContent className="overflow-auto h-[500px]">
                    <Table>
                        <TableBody>
                            {incidents.map(inc => (
                                <TableRow
                                    key={inc.id}
                                    className="cursor-pointer hover:bg-muted"
                                    onClick={() => loadEvidence(inc.id)}
                                >
                                    <TableCell>
                                        <div className="font-medium">{inc.title}</div>
                                        <div className="text-xs text-muted-foreground">{new Date(inc.createdAt).toLocaleDateString()}</div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="col-span-2">
                <CardHeader>
                    <CardTitle>Evidence Graph & Timeline {loading && '(Loading...)'}</CardTitle>
                </CardHeader>
                <CardContent className="h-[500px] overflow-auto">
                    {!selectedIncident ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Select an incident to view evidence.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Simple Graph Representation List since we lack a graph library setup */}
                            <div>
                                <h3 className="font-semibold mb-2">Linked Entities</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {evidence.map(e => (
                                        <div key={e.id} className="p-2 border rounded text-sm">
                                            <Badge variant="outline" className="mb-1">{e.labels?.[0] || 'Unknown'}</Badge>
                                            <div className="truncate" title={JSON.stringify(e.properties)}>
                                                {e.properties.name || e.properties.value || e.properties.eventType || e.id}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
