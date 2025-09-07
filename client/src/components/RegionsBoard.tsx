import React,{useEffect,useState} from 'react';
import $ from 'jquery';

interface RegionData {
  region: string;
  peer: string;
  lag: number;
  seq: number;
  status: string;
}

export default function RegionsBoard(){
  const [rows,setRows]=useState<RegionData[]>([]);
  useEffect(()=>{ const s=new EventSource('/api/regions/stream'); s.onmessage=(e)=>setRows(JSON.parse(e.data)); return ()=>s.close(); },[]);
  useEffect(()=>{ const h=function(this:HTMLInputElement){ const v=this.value?.toString().toLowerCase()||''; ($('.row') as JQuery<HTMLElement>).each(function(){ const lag=Number($(this).data('lag')||0); $(this).toggle(lag>=v);});}; $('#filter').on('input',h); return()=>$('#filter').off('input',h);},[rows.length]);
  return (<div className="p-4 rounded-2xl shadow">
    <div className="flex gap-2 mb-2"><h3 className="text-lg font-semibold">Regions & Replication</h3><input id="filter" className="border rounded px-2 py-1" placeholder="filter…"/></div>
    <table className="w-full text-sm"><thead><tr><th>Region</th><th>Peer</th><th>Lag</th><th>LastSeq</th><th>Status</th></tr></thead>
      <tbody>{rows.map((r:RegionData)=>(<tr key={r.peer} className="row border-b"><td>{r.region}</td><td>{r.peer}</td><td>{r.lag}s</td><td>{r.seq}</td><td>{r.status}</td></tr>))}</tbody>
    </table>
  </div>);
}

