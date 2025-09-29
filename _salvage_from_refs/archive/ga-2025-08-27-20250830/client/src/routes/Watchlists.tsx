import React, { useState } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, Button } from '@mui/material';

const WL_Q = gql`query{ myWatchlists{ id name rules } }`;
const ALERTS_Q = gql`query($watchlistId:ID,$status:String,$limit:Int){ alerts(watchlistId:$watchlistId,status:$status,limit:$limit){ id status docHash createdAt } }`;
const CASES_Q = gql`query{ cases{ id name } }`;
const ADD_ITEM_M = gql`mutation($caseId:ID!,$kind:String!,$refId:ID!){ addCaseItem(caseId:$caseId,kind:$kind,refId:$refId){ id } }`;

export default function Watchlists(){
  const { data } = useQuery(WL_Q);
  const [selected, setSelected] = React.useState<string|null>(null);
  const { data: alerts, refetch } = useQuery(ALERTS_Q, { variables:{ watchlistId: selected, limit: 50 }, skip: !selected });
  const { data: cases } = useQuery(CASES_Q);
  const [addItem] = useMutation(ADD_ITEM_M);
  const [caseOpen, setCaseOpen] = useState(false);
  const [caseId, setCaseId] = useState('');
  const [pendingAlert, setPendingAlert] = useState<any>(null);
  return (
    <div className="p-4">
      <h2>Watchlists</h2>
      <div style={{ display:'flex', gap:16 }}>
        <div style={{ width: 320 }}>
          <ul>
            {(data?.myWatchlists||[]).map((w:any)=> (
              <li key={w.id}><button onClick={()=>setSelected(w.id)}>{w.name}</button></li>
            ))}
          </ul>
        </div>
        <div style={{ flex:1 }}>
          <h3>Alerts</h3>
          <ul>
            {(alerts?.alerts||[]).map((a:any)=> (
              <li key={a.id} style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span>{a.status} • {a.docHash} • {a.createdAt}</span>
                <Button size="small" variant="outlined" onClick={()=>{ setPendingAlert(a); setCaseOpen(true); }}>Add to Case</Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Dialog open={caseOpen} onClose={()=>setCaseOpen(false)}>
        <DialogTitle>Add alert to case</DialogTitle>
        <DialogContent>
          <Select fullWidth size="small" value={caseId} onChange={(e)=>setCaseId(String(e.target.value))}>
            {(cases?.cases||[]).map((c:any)=> (<MenuItem value={c.id} key={c.id}>{c.name}</MenuItem>))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setCaseOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={async ()=>{
            if (!caseId || !pendingAlert) return;
            await addItem({ variables: { caseId, kind:'ALERT', refId: pendingAlert.id } });
            setCaseOpen(false); setCaseId(''); setPendingAlert(null);
          }}>Add</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
