import http from 'k6/http';

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 400 },
    { duration: '1m', target: 0 }
  ]
};

export default function () {
  http.get(`${__ENV.BASE || 'http://localhost:7011'}/ledger/export/123`);
}
