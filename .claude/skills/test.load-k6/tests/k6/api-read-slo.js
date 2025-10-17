import http from 'k6/http';
import { sleep } from 'k6';
export const options = {
  vus: 20,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<350']
  }
};
export default function () {
  const res = http.get('http://localhost:4000/health');
  sleep(0.2);
}
