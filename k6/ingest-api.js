import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

const API_URL = __ENV.API_URL || 'http://localhost:4012';

export default function () {
  const file = {
    data: 'header1,header2\nvalue1,value2',
    filename: 'test.csv',
  };

  const res = http.post(`${API_URL}/ingest`, {
    file: http.file(file.data, file.filename),
    config: JSON.stringify({}),
  });

  check(res, {
    'status is 201': (r) => r.status === 201,
  });
}
