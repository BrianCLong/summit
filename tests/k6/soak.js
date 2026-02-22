import http from 'k6/http';
export const options = {
  vus: 10,
  duration: '30m',
  thresholds: { http_req_failed: ['rate<0.01'] },
};
export default function () {
  http.get(__ENV.HEALTH_URL || 'http://localhost:3000/health');
}
