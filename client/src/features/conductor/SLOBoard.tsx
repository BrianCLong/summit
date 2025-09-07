import React, { useEffect, useState } from 'react';

interface SloData {
  p95: number;
  successRatePct: number;
  costPerRunUsd: number;
  burnRate: number;
}

export default function SLOBoard(){
  const [d,setD]=useState<SloData | null>(null);
  async function load(){ const r=await fetch('/api/slo?runbook=demo&tenant=acme'); setD(await r.json()); }
  useEffect(()=>{ load(); const t=setInterval(load, 5000); return ()=>clearInterval(t); },[]);
  return (
    <div className="p-4 rounded-2xl shadow">
      <h3 className="text-lg font-semibold">SLOs</h3>
      {d && <div className="text-sm">p95: {Math.round(d.p95)}ms • success: {Number(d.successRatePct).toFixed(2)}% • cost/run: ${Number(d.costPerRunUsd).toFixed(2)} • burn: {(Number(d.burnRate)*100).toFixed(0)}%</div>}
    </div>
  );
}
