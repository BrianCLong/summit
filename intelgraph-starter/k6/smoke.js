import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { vus: 1, duration: '30s' };

const gateway = __ENV.GATEWAY_URL || 'http://localhost:4000/graphql';
const ingest = __ENV.INGEST_URL || 'http://localhost:4100/upload';

export default function () {
  const query = { query: '{ ping }' };
  const res = http.post(gateway, JSON.stringify(query), {
    headers: { 'Content-Type': 'application/json' }
  });
  check(res, {
    'gateway ok': (r) => r.status === 200,
    'ping response': (r) => r.body.includes('pong')
  });

  const payload = JSON.stringify({ filename: 'smoke.txt', content: Buffer.from('hello').toString('base64') });
  const ingestRes = http.post(ingest, payload, {
    headers: { 'Content-Type': 'application/json' }
  });
  check(ingestRes, {
    'ingest ok': (r) => r.status === 200,
    'path returned': (r) => r.json('path').includes('s3://')
  });

  sleep(1);
}
