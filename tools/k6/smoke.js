import http from 'k6/http';
import { check } from 'k6';
export default function () {
  const res = http.get(`${__ENV.BASE_URL}/health`);
  check(res, { 'status 200': (r) => r.status === 200 });
}
