import React,{useEffect,useState} from 'react';
import $ from 'jquery';

interface SiteData {
  id: string;
  name: string;
  region: string;
  residency: string;
  bandwidth?: string;
  bandwidth_class?: string;
  backlog: number;
  lastSync?: string;
  last_seen?: string;
}

export default function SitesDashboard(){
  const [sites,setSites]=useState<SiteData[]>([]);
  useEffect(()=>{ const s=new EventSource('/api/sites/stream'); s.onmessage=(e)=>setSites(JSON.parse(e.data)); return ()=>s.close(); },[]);
  useEffect(()=>{ const h=function(this:HTMLInputElement){ const v=this.value?.toString().toLowerCase()||''; ($('.site-row') as JQuery<HTMLElement>).each(function(){ $(this).toggle($(this).text().toLowerCase().indexOf(v)>=0);});}; $('#q').on('input',h); return()=>$('#q').off('input',h);},[sites.length]);
  return (<div className="p-4 rounded-2xl shadow">
    <div className="flex gap-2 mb-2"><h3 className="text-lg font-semibold">Sites</h3><input id="q" className="border rounded px-2 py-1" placeholder="filter…" /></div>
    <table className="w-full text-sm"><thead><tr><th>Site</th><th>Region</th><th>Residency</th><th>Bandwidth</th><th>Backlog</th><th>Last Sync</th></tr></thead>
      <tbody>{sites.map((s:SiteData)=>(<tr key={s.id} className="site-row border-b"><td>{s.name}</td><td>{s.region}</td><td>{s.residency}</td><td>{s.bandwidth||s.bandwidth_class}</td><td>{s.backlog}</td><td>{s.lastSync||s.last_seen}</td></tr>))}</tbody></table>
  </div>);
}

