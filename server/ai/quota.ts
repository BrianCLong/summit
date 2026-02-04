import Redis from 'ioredis'; const r=new Redis(process.env.REDIS_URL||'redis://localhost:6379');
export async function take(tenant:string, capacity:number, refillPerMin:number, cost:number){
  const key=`q:${tenant}`; const now=Date.now();
  const s = JSON.parse((await r.get(key))||`{"tokens":${capacity},"ts":${now}}`)
  const elapsed=(now-s.ts)/60000; s.tokens=Math.min(capacity, s.tokens+elapsed*refillPerMin);
  if(s.tokens<cost) return {ok:false, waitMs: Math.ceil((cost-s.tokens)/refillPerMin*60000)};
  s.tokens-=cost; s.ts=now; await r.set(key, JSON.stringify(s)); return {ok:true, remaining:s.tokens};
}