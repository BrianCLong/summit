import client from 'prom-client';
client.collectDefaultMetrics();
export const intelAdapterBatch = new client.Counter({ name:'companyos_intel_adapter_items_total', help:'items', labelNames:['adapter'] });
export const intelAdapterErrors = new client.Counter({ name:'companyos_intel_adapter_errors_total', help:'errors', labelNames:['adapter'] });
export const intelPollLatency = new client.Histogram({ name:'companyos_intel_poll_latency_seconds', help:'poll latency', buckets:[0.1,0.3,1,3,10], labelNames:['adapter'] });
export function metricsMiddleware(req:any,res:any,next:any){
  if (req.path === '/metrics') return res.type('text/plain').send(client.register.metrics());
  next();
}