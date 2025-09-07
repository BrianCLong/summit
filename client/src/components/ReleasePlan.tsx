import React,{useEffect,useState} from "react";
export default function ReleasePlan(){
  const [rows,setRows]=useState<string[]>([]);
  useEffect(()=>{ fetch("/api/release/plan").then(r=>r.json()).then(x=>setRows(x.queue||[])); },[]);
  return (<div className="p-4 rounded-2xl shadow">
    <h3 className="text-lg font-semibold mb-2">Release Train Plan</h3>
    <ol className="list-decimal pl-6">{rows.map((n,i)=>(<li key={i}>{n}</li>))}</ol>
  </div>);
}