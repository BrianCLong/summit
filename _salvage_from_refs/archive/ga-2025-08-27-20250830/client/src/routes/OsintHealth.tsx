import React, { useEffect, useState } from 'react';
import { Button, Drawer, List, ListItem, ListItemText } from '@mui/material';
import { gql, useQuery } from '@apollo/client';
import $ from 'jquery';
import AddCaseModal from '../components/cases/AddCaseModal'; // New import

const HEALTH_Q = gql`
  query Health($sourceId:ID){ osintHealth(sourceId:$sourceId){ sourceId name lastRunAt lastStatus itemsIngested errorRate nextRunAt avgLatency p95Latency } }
`;

export default function OsintHealth(){
  const { data, refetch } = useQuery(HEALTH_Q);
  const [logsOpen, setLogsOpen] = useState<string|null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [running, setRunning] = useState<string|null>(null);
  const [addCaseModalOpen, setAddCaseModalOpen] = useState(false); // New state for modal
  const [selectedItem, setSelectedItem] = useState(null); // To store the item being added to case

  const runNow = async (id:string) => {
    setRunning(id);
    $(document).trigger('intelgraph:toast', [`Scheduling fetch for ${id}`]);
    await fetch('/graphql', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ query: 'mutation($id:ID!){ scheduleFetch(sourceId:$id){ id status } }', variables: { id } }) });
    setRunning(null);
    refetch();
  }

  const openLogs = async (id:string) => {
    setLogsOpen(id);
    const res = await fetch('/graphql', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ query: 'query($id:ID){ osintRuns(sourceId:$id, limit:10){ startedAt finishedAt status itemsIngested latencyMs error } }', variables: { id } }) });
    const json = await res.json();
    setLogs(json?.data?.osintRuns || []);
  };

  const handleAddToCaseClick = (kind, refId) => {
    setSelectedItem({ kind, refId });
    setAddCaseModalOpen(true);
  };

  return (
    <div className="p-4">
      <h2>OSINT Health</h2>
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="border px-2">Name</th>
            <th className="border px-2">Last Run</th>
            <th className="border px-2">Status</th>
            <th className="border px-2">Ingested</th>
            <th className="border px-2">Err%</th>
            <th className="border px-2">Next Run</th>
            <th className="border px-2">Avg (ms)</th>
            <th className="border px-2">P95 (ms)</th>
            <th className="border px-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {(data?.osintHealth||[]).map((h:any)=> (
            <tr key={h.sourceId}>
              <td className="border px-2">{h.name}</td>
              <td className="border px-2">{h.lastRunAt || '-'}</td>
              <td className="border px-2">{h.lastStatus || '-'}</td>
              <td className="border px-2">{h.itemsIngested || 0}</td>
              <td className="border px-2">{h.errorRate || 0}</td>
              <td className="border px-2">{h.nextRunAt || '-'}</td>
              <td className="border px-2">{h.avgLatency || 0}</td>
              <td className="border px-2">{h.p95Latency || 0}</td>
              <td className="border px-2" style={{ display:'flex', gap:6 }}>
                <Button size="small" variant="outlined" onClick={()=>runNow(h.sourceId)} disabled={running===h.sourceId}>Run now</Button>
                <Button size="small" onClick={()=>openLogs(h.sourceId)}>Logs</Button>
                <Button size="small" variant="outlined" onClick={() => handleAddToCaseClick('OSINT_HEALTH_LOG', h.sourceId)}>Add to Case</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Drawer anchor="right" open={!!logsOpen} onClose={()=>setLogsOpen(null)}>
        <div style={{ width: 360, padding: 16 }}>
          <h3 style={{ marginTop:0 }}>Last 10 Runs</h3>
          <List dense>
            {logs.map((r:any, i:number)=> (
              <ListItem key={i}>
                <ListItemText primary={`${r.status} • ${r.itemsIngested||0} items • ${r.latencyMs||0}ms`} secondary={`${r.startedAt} → ${r.finishedAt||''} ${r.error||''}`} />
              </ListItem>
            ))}
          </List>
        </div>
      </Drawer>

      {selectedItem && (
        <AddCaseModal
          open={addCaseModalOpen}
          handleClose={() => {
            setAddCaseModalOpen(false);
            setSelectedItem(null);
          }}
          itemKind={selectedItem.kind}
          itemRefId={selectedItem.refId}
        />
      )}
    </div>
  )
}
