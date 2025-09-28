import React,{useEffect,useState} from 'react';
import { Button } from '@/components/ui/button';

export default function QecnPanel({ client, tenant }: any){
  const [budgets,setBudgets]=useState<any>();
  const [backends,setBackends]=useState<any[]>([]);
  useEffect(()=>{(async()=>{
    setBudgets(await client.qcBudgets({tenant}));
    setBackends(await client.quantumBackends());
  })();},[tenant]);
  return (
    <div className="grid gap-3">
      <div className="text-xl font-semibold">Quantum‑Enhanced Cognitive Networks</div>
      <pre className="bg-gray-100 p-3 rounded">{JSON.stringify(budgets,null,2)}</pre>
      <div className="grid grid-cols-3 gap-2">
        {backends.map(b=> <div key={b.id} className="p-3 rounded border"><div className="font-medium">{b.provider} — {b.geo}</div><div className="text-xs">residency: {b.residencyTag}</div></div>)}
      </div>
      <div className="flex gap-2">
        <Button onClick={()=>client.qcBudgetsSet({tenant, input:{ minutesMonthly:120, surgeThreshold:0.8, hardCeiling:150 }})}>Set Budgets</Button>
      </div>
    </div>
  );
}