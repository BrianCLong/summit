import http from 'k6/http';

export const options = {
  stages: [
    { duration: '30s', target: 200 },
    { duration: '30s', target: 0 }
  ]
};

export default function () {
  http.get(`${__ENV.BASE || 'http://localhost:7011'}/ledger/export/123`);
}
