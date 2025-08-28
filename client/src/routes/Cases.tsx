import React, { useState } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { Button, TextField } from '@mui/material';

const CASES_Q = gql`query($status:String){ cases(status:$status){ id name status priority summary createdAt } }`;
const CREATE_M = gql`mutation($input:CaseInput!){ createCase(input:$input){ id name status } }`;

export default function Cases(){
  const { data, refetch } = useQuery(CASES_Q);
  const [createCase] = useMutation(CREATE_M);
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('');
  const [summary, setSummary] = useState('');

  const onCreate = async () => {
    if (!name) return;
    await createCase({ variables: { input: { name, priority, summary } } });
    setName(''); setPriority(''); setSummary('');
    refetch();
  };

  return (
    <div className="p-4">
      <h2>Cases</h2>
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <TextField size="small" label="Name" value={name} onChange={(e)=>setName(e.target.value)} />
        <TextField size="small" label="Priority" value={priority} onChange={(e)=>setPriority(e.target.value)} />
        <TextField size="small" label="Summary" value={summary} onChange={(e)=>setSummary(e.target.value)} />
        <Button variant="contained" onClick={onCreate}>Create</Button>
      </div>
      <table className="min-w-full border">
        <thead><tr><th className="border px-2">Name</th><th className="border px-2">Status</th><th className="border px-2">Priority</th><th className="border px-2">Created</th></tr></thead>
        <tbody>
          {(data?.cases||[]).map((c:any)=> (
            <tr key={c.id}><td className="border px-2">{c.name}</td><td className="border px-2">{c.status}</td><td className="border px-2">{c.priority||''}</td><td className="border px-2">{c.createdAt}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

