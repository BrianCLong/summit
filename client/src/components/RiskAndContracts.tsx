import React,{useEffect,useState} from "react"; import $ from "jquery";
export default function RiskAndContracts(){
  const [h,setH]=useState<string>(""); const [c,setC]=useState<any>(null);
  useEffect(()=>{ fetch("/api/pm/heatmap").then(r=>r.text()).then(setH); fetch("/api/contracts/current").then(r=>r.json()).then(setC); },[]);
  useEffect(()=>{ $("#risk-q").on("input",function(){ const v=($(this).val()||"").toString().toLowerCase(); $(".risk-row").each(function(){ $(this).toggle($(this).text().toLowerCase().includes(v)); });}); },[h]);
  return (<div className="grid gap-4 md:grid-cols-2">
    <div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2"><h3 className="font-semibold">Risk Heatmap</h3><input id="risk-q" className="border rounded px-2 py-1" placeholder="filter…" /></div>
      <pre className="text-xs whitespace-pre-wrap">{h}</pre>
    </div>
    <div className="p-4 rounded-2xl shadow">
      <h3 className="font-semibold mb-2">Change Contract</h3>
      {!c? <div>loading…</div> :
      <ul className="text-sm"><li>Area: {c.area}</li><li>Intent: {c.intent}</li><li>p95 ≤ {c.budgets.p95_ms}ms</li><li>Error ≤ {c.budgets.err_rate_pct}%</li></ul>}
    </div>
  </div>);
}