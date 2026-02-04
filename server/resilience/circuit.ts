import CircuitBreaker from 'opossum';
export function wrap<T extends (...a:any[])=>Promise<any>>(fn:T, name:string){
  const breaker = new CircuitBreaker(fn, { timeout: 2000, errorThresholdPercentage: 50, resetTimeout: 10000, rollingCountBuckets: 10, rollingCountTimeout: 10000 });
  breaker.fallback((...args)=>({ error: 'degraded', data: null }));
  breaker.on('open', ()=> console.warn(`[cb] open ${name}`));
  return (...args:any[])=> breaker.fire(...args);
}