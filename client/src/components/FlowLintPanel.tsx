import React,{useEffect,useState} from "react"; import $ from "jquery";
export default function FlowLintPanel(){
  const [items,setItems]=useState<any[]>([]);
  useEffect(()=>{ fetch("/api/flow/lint").then(r=>r.json()).then(setItems); $("#q").on("input",function(){ const v=$(this).val()?.toString().toLowerCase()||""; $(".lint-row").each(function(){ $(this).toggle($(this).text().toLowerCase().includes(v));});}); },[]);
  return (<div className="p-4 rounded-2xl shadow">
    <div className="flex gap-2 mb-2"><h3 className="text-lg font-semibold">FlowLint</h3><input id="q" className="border rounded px-2 py-1" placeholder="filter…"/></div>
    <ul className="text-sm">{items.map((x:any,i:number)=>(<li key={i} className={`lint-row border-b py-1 ${x.level==='error'?'text-red-600':''}`}>{x.id} — {x.msg}</li>))}</ul>
  </div>);
}