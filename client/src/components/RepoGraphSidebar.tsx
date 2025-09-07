import React,{useEffect,useState} from "react"; import $ from "jquery";
export default function RepoGraphSidebar({ files }:{ files:string[] }){ 
  const [imp,setImp]=useState<string[]>([]);
  useEffect(()=>{ fetch(`/api/repograph/impacted?files=${files.join(",")}`).then(r=>r.json()).then(d=>setImp(d.impacted||[])); },[files.join(",")]);
  useEffect(()=>{ $("#rg-q").on("input",function(){ const v=$(this).val()?.toString().toLowerCase()||""; $(".rg-row").each(function(){ $(this).toggle($(this).text().toLowerCase().includes(v));});});},[imp.length]);
  return (<div className="p-4 rounded-2xl shadow">
    <div className="flex gap-2"><h4 className="font-semibold">Impacted entities</h4><input id="rg-q" className="border rounded px-2 py-1" placeholder="filter…"/></div>
    <ul className="mt-2 text-sm">{imp.map((x,i)=>(<li key={i} className="rg-row border-b py-1">{x}</li>))}</ul>
  </div>);
}