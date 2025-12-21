import http from 'k6/http';
import { Trend } from 'k6/metrics';
const t = new Trend('prov_export_p95');
export const options = { vus: 1, iterations: 50, thresholds: { 'prov_export_p95': ['p(95)<250'] } };
export default function(){ const r = http.get(`${__ENV.BASE||'http://localhost:7011'}/ledger/export/123`); t.add(r.timings.duration); }
