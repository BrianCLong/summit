import { test, expect } from '@playwright/test';

const N = parseInt(process.env.N || '50', 10);

async function req(api:string, op:string, query:string, vars:any){
  const res = await fetch(api, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ operationName:op, query, variables: vars })});
  return res;
}

test('reads within soft p95 threshold', async () => {
  const api = process.env.GQL_URL!;
  const q = 'query($id:ID!){ entity(id:$id){ id name }}';
  const durs:number[] = [];
  for (let i=0;i<N;i++){
    const t0 = performance.now();
    const r = await req(api,'GetEntity',q,{id:'G100'});
    expect(r.status).toBe(200);
    durs.push(performance.now()-t0);
  }
  durs.sort((a,b)=>a-b);
  const p95 = durs[Math.floor(0.95*N)-1];
  console.log('p95(ms)=', p95);
  expect(p95).toBeLessThan(350);
});
