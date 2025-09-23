import { Gauge } from 'prom-client';
export const activeModelGauge = new Gauge({ name:'active_model_info', help:'labels carry info', labelNames:['name','version'] });
export function setModelLabels(n:string,v:string){ activeModelGauge.labels({name:n,version:v}).set(1); }
