import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Pipeline {
  key: string;
  name: string;
  type: string;
}

interface DlqRecord {
  id: string;
  pipeline_key: string;
  stage: string;
  reason: string;
  created_at: string;
}

export default function IngestionPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [dlq, setDlq] = useState<DlqRecord[]>([]);

  useEffect(() => {
    fetch('/api/ingestion/pipelines').then(res => res.json()).then(setPipelines);
    fetch('/api/ingestion/dlq').then(res => res.json()).then(setDlq);
  }, []);

  const runPipeline = async (key: string) => {
      // Demo config
      const config = {
          key,
          tenantId: 'demo-tenant',
          name: 'Demo Run',
          source: { type: 'file', config: { path: './demo.csv' } },
          stages: ['raw', 'normalize', 'enrich', 'index']
      };

      await fetch(`/api/ingestion/pipelines/${key}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
      });
      alert('Pipeline started!');
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Data Ingestion & Knowledge Fabric</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pipelines</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipelines.map(p => (
                  <TableRow key={p.key}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.type}</TableCell>
                    <TableCell>
                      <Button onClick={() => runPipeline(p.key)} size="sm">Run Now</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dead Letter Queue (DLQ)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pipeline</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dlq.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.pipeline_key}</TableCell>
                    <TableCell>{r.stage}</TableCell>
                    <TableCell className="text-red-500">{r.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
