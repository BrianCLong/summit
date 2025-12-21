import http from 'k6/http';

export const options = {
  vus: 20,
  duration: '30m'
};

export default function () {
  http.get(`${__ENV.BASE || 'http://localhost:7011'}/ledger/export/123`);
}
