/**
 * ML Inference Autoscaling Load Test
 *
 * Generates bursty GPU-backed inference traffic to validate Horizontal Pod Autoscaler
 * behaviour, Prometheus custom metrics, and resilience under sustained demand.
 *
 * Usage:
 *   ML_SERVICE_URL=https://ml.example.com \
 *   k6 run tests/load/ml-inference.k6.js --tag test_suite=ml-autoscale
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Gauge, Rate, Counter } from 'k6/metrics';

export const inferenceLatency = new Trend('ml_inference_duration');
export const queueDepthGauge = new Gauge('ml_inference_queue_depth');
export const gpuUtilizationGauge = new Gauge('ml_gpu_utilization');
export const inferenceErrors = new Rate('ml_inference_errors');
export const saturationEvents = new Counter('ml_inference_saturation_events');

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const options = {
  scenarios: {
    inference_load: {
      executor: 'ramping-arrival-rate',
      startRate: Number(__ENV.START_RPS || 10),
      timeUnit: '1s',
      preAllocatedVUs: Number(__ENV.PRE_ALLOCATED_VUS || 20),
      maxVUs: Number(__ENV.MAX_VUS || 200),
      stages: [
        { target: Number(__ENV.BASELINE_RPS || 30), duration: '5m' },
        { target: Number(__ENV.PEAK_RPS || 90), duration: '10m' },
        { target: Number(__ENV.SUSTAINED_RPS || 60), duration: '10m' },
        { target: Number(__ENV.COOLDOWN_RPS || 0), duration: '5m' },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<900'],
    ml_inference_duration: ['p(95)<750'],
    ml_inference_errors: ['rate<0.02'],
    ml_inference_queue_depth: ['value<120'],
  },
};

const BASE_URL = __ENV.ML_SERVICE_URL || 'http://localhost:8000';
const INFERENCE_PATH = __ENV.ML_INFERENCE_PATH || '/v1/infer';
const PAYLOAD_SIZE = Number(__ENV.ML_PAYLOAD_SIZE || 512);

const buildPayload = () => {
  const tokens = PAYLOAD_SIZE;
  const prompt = `autoscale-benchmark-${__VU}-${Date.now()}`;
  return JSON.stringify({
    prompt,
    parameters: {
      max_tokens: tokens,
      temperature: 0.2,
      top_p: 0.9,
    },
    metadata: {
      tenant: __ENV.ML_TENANT || 'summit-prod',
      trace_id: `${__VU}-${Date.now()}`,
    },
  });
};

const params = {
  headers: {
    'Content-Type': 'application/json',
    'X-Request-ID': `${__VU}-${__ITER}-${Date.now()}`,
  },
};

export default function main() {
  const response = http.post(`${BASE_URL}${INFERENCE_PATH}`, buildPayload(), params);

  const ok = check(response, {
    'status is 200': (res) => res.status === 200,
    'duration under 1s': (res) => res.timings.duration < 1000,
  });

  inferenceLatency.add(response.timings.duration);
  inferenceErrors.add(!ok);

  const queueDepthHeader = response.headers['X-Queue-Depth'] || response.headers['x-queue-depth'];
  if (queueDepthHeader) {
    const queueDepth = toNumber(queueDepthHeader, 0);
    queueDepthGauge.add(queueDepth);
    if (queueDepth > 100) {
      saturationEvents.add(1);
    }
  }

  const gpuUtilHeader = response.headers['X-Gpu-Utilization'] || response.headers['x-gpu-utilization'];
  if (gpuUtilHeader) {
    gpuUtilizationGauge.add(toNumber(gpuUtilHeader, 0));
  }

  sleep(Number(__ENV.SLEEP_INTERVAL || 0.2));
}
