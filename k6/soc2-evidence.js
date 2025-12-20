import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const soc2PacketGenerationTime = new Trend('soc2_packet_generation_time');

export const options = {
  stages: [
    { duration: '30s', target: 5 }, // Ramp up to 5 virtual users over 30s
    { duration: '1m', target: 5 },  // Stay at 5 VU for 1 minute
    { duration: '10s', target: 0 }, // Ramp down to 0 VU
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1500'], // 95% of requests must complete within 1.5s
    'http_req_failed': ['rate<0.01'],   // <1% of requests should fail
  },
};

export default function () {
  const startDate = '2025-01-01T00:00:00.000Z';
  const endDate = '2025-12-31T23:59:59.999Z';

  // Test the JSON endpoint
  const jsonRes = http.get(`http://localhost:4000/api/compliance/soc2-packet?startDate=${startDate}&endDate=${endDate}`, {
    headers: { 'x-test-user-role': 'ADMIN' }
  });

  check(jsonRes, {
    'JSON status is 200': (r) => r.status === 200,
    'JSON response has signature': (r) => r.headers['X-Evidence-Signature'] != null,
  });
  soc2PacketGenerationTime.add(jsonRes.timings.duration);

  sleep(1);

  // Test the PDF endpoint
  const pdfRes = http.get(`http://localhost:4000/api/compliance/soc2-packet?startDate=${startDate}&endDate=${endDate}&format=pdf`, {
    headers: { 'x-test-user-role': 'ADMIN' }
  });

  check(pdfRes, {
    'PDF status is 200': (r) => r.status === 200,
    'PDF response has signature': (r) => r.headers['X-Evidence-Signature'] != null,
  });
  soc2PacketGenerationTime.add(pdfRes.timings.duration);

  sleep(3); // Wait a bit longer between cycles
}
