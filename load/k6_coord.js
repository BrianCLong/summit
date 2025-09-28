import http from 'k6/http'; import { check, sleep } from 'k6';
export let options = { vus: 50, duration: '2m' };
export default function () {
  const url = 'http://localhost:8000/coord/edges?a=acc_1&min=2.0';
  const res = http.get(url);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(0.2);
}