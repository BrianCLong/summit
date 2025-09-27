/**
 * Symphony Orchestra MVP-3: k6 Performance Testing
 * Mixed streaming/non-streaming scenarios with SLO thresholds
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('symphony_errors');
const latencyTrend = new Trend('symphony_latency');
const utilityTrend = new Trend('symphony_utility');
const sloBreaches = new Counter('symphony_slo_breaches');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 20 },   // Ramp-up
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp to peak
    { duration: '5m', target: 100 },  // Stay at peak
    { duration: '2m', target: 0 },    // Ramp-down
  ],
  
  // SLO-aligned thresholds - these will fail the CI if breached
  thresholds: {
    'http_req_duration{route:execute}': ['p(95)<2500'],  // 2.5s local SLO
    'http_req_duration{route:execute,provider:remote}': ['p(95)<6000'], // 6s remote SLO
    'symphony_errors': ['rate<0.05'],     // 5% error rate SLO
    'http_req_failed': ['rate<0.05'],     // HTTP failure rate
    'symphony_slo_breaches': ['count<10'], // Max 10 SLO breaches total
  },
  
  ext: {
    loadimpact: {
      projectID: 'symphony-orchestra',
      name: 'MVP-3 Route Execute Performance Test'
    }
  }
};

// Base URLs and configuration
const BASE_URL = __ENV.SYMPHONY_BASE_URL || 'http://127.0.0.1:8787';
const PROXY_URL = `${BASE_URL}`;

// Test data generators
const TASKS = ['nl2cypher', 'rag', 'coding', 'general', 'analysis'];
const MODELS = ['local/llama', 'local/llama-cpu', 'local/qwen-coder'];
const CONTEXTS = {
  short: 'Simple test query',
  medium: 'A' + 'B'.repeat(500) + 'complex analysis task with moderate context',
  long: 'C' + 'D'.repeat(2000) + 'very detailed analysis requiring extensive context processing'
};

function generateWorkload() {
  const task = TASKS[randomIntBetween(0, TASKS.length - 1)];
  const contextType = ['short', 'medium', 'long'][randomIntBetween(0, 2)];
  const streaming = Math.random() < 0.3; // 30% streaming requests
  
  return {
    task,
    loa: randomIntBetween(1, 3),
    input: CONTEXTS[contextType],
    stream: streaming,
    temperature: Math.random() * 0.8 + 0.1, // 0.1 - 0.9
    max_tokens: randomIntBetween(100, 1000),
    context_type: contextType
  };
}

function makeRequest(payload, tags = {}) {
  const startTime = Date.now();
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'k6-performance-test/mvp3',
      'X-Test-Session': __ENV.K6_TEST_SESSION || 'default'
    },
    timeout: '30s',
    tags: Object.assign({
      route: 'execute',
      provider: payload.model?.includes('local') ? 'local' : 'remote',
      streaming: payload.stream ? 'true' : 'false',
      context_size: payload.context_type
    }, tags)
  };
  
  const response = http.post(`${PROXY_URL}/route/execute`, JSON.stringify(payload), params);
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Record metrics
  latencyTrend.add(duration, tags);
  
  // Check for SLO breaches
  const isLocal = payload.model?.includes('local');
  const sloThreshold = isLocal ? 2500 : 6000;
  
  if (duration > sloThreshold) {
    sloBreaches.add(1, { breach_type: 'latency', provider: isLocal ? 'local' : 'remote' });
  }
  
  return response;
}

// Main test scenarios
export default function() {
  const workload = generateWorkload();
  
  group('Route Execute - Mixed Workload', () => {
    const response = makeRequest(workload);
    
    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < SLO': (r) => {
        const isLocal = workload.model?.includes('local');
        const threshold = isLocal ? 2500 : 6000;
        return r.timings.duration < threshold;
      },
      'has decision_id': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.decision_id && body.decision_id.length > 0;
        } catch (e) {
          return false;
        }
      },
      'has trace context': (r) => {
        return r.headers['X-Trace-Id'] && r.headers['X-Trace-Id'].length > 0;
      }
    });
    
    if (!success) {
      errorRate.add(1);
    }
    
    // Parse response for utility metrics
    try {
      const body = JSON.parse(response.body);
      if (body.utility_score) {
        utilityTrend.add(body.utility_score);
      }
    } catch (e) {
      // Ignore parsing errors
    }
  });
  
  // Realistic think time
  sleep(randomIntBetween(1, 3));
}

// Streaming scenario
export function streamingScenario() {
  group('Route Execute - Streaming', () => {
    const workload = generateWorkload();
    workload.stream = true;
    workload.max_tokens = randomIntBetween(500, 2000); // Larger for streaming
    
    const response = makeRequest(workload, { scenario: 'streaming' });
    
    check(response, {
      'streaming status is 200': (r) => r.status === 200,
      'streaming has chunks': (r) => {
        // For streaming, we expect either chunked response or server-sent events
        return r.headers['Transfer-Encoding'] === 'chunked' || 
               r.headers['Content-Type']?.includes('text/event-stream');
      }
    });
  });
}

// Burst scenario for stress testing
export function burstScenario() {
  group('Route Execute - Burst Load', () => {
    // Send multiple requests rapidly to test burst handling
    const responses = [];
    
    for (let i = 0; i < 5; i++) {
      const workload = generateWorkload();
      workload.task = 'nl2cypher'; // Focus on one task for burst
      
      const response = makeRequest(workload, { scenario: 'burst', batch: i });
      responses.push(response);
      
      sleep(0.1); // Minimal delay
    }
    
    // Check that all requests in burst were handled
    const allSuccessful = responses.every(r => r.status === 200);
    check(null, {
      'burst requests all successful': () => allSuccessful
    });
  });
}

// High-value workload scenario
export function highValueScenario() {
  group('Route Execute - High Value Tasks', () => {
    const workload = {
      task: 'analysis',
      loa: 3, // Maximum autonomy
      input: CONTEXTS.long,
      stream: false,
      priority: 0.9,
      expected_quality: 0.95,
      temperature: 0.1 // Lower temperature for high-value work
    };
    
    const response = makeRequest(workload, { scenario: 'high_value' });
    
    check(response, {
      'high-value task completed': (r) => r.status === 200,
      'response quality acceptable': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.quality_score >= 0.8;
        } catch (e) {
          return false;
        }
      }
    });
  });
}

// Setup function - runs once per VU
export function setup() {
  // Verify the service is running
  const healthCheck = http.get(`${BASE_URL}/health`);
  
  if (healthCheck.status !== 200) {
    throw new Error(`Service not available: ${healthCheck.status}`);
  }
  
  console.log('Symphony Orchestra performance test starting...');
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Test session: ${__ENV.K6_TEST_SESSION || 'default'}`);
  
  return {
    startTime: Date.now(),
    baseUrl: BASE_URL
  };
}

// Teardown function - runs once after all VUs complete
export function teardown(data) {
  const endTime = Date.now();
  const duration = (endTime - data.startTime) / 1000;
  
  console.log(`Performance test completed in ${duration}s`);
  
  // Generate summary report
  const summaryUrl = `${BASE_URL}/test/summary`;
  http.post(summaryUrl, JSON.stringify({
    test_session: __ENV.K6_TEST_SESSION || 'default',
    duration_seconds: duration,
    timestamp: new Date().toISOString()
  }));
}

// Scenario configurations for different test types
export const scenarios = {
  // Main mixed workload
  mixed_load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 20 },
      { duration: '5m', target: 50 },
      { duration: '2m', target: 0 }
    ],
    gracefulRampDown: '30s'
  },
  
  // Streaming-focused test
  streaming_load: {
    executor: 'constant-vus',
    vus: 10,
    duration: '3m',
    exec: 'streamingScenario',
    gracefulStop: '10s'
  },
  
  // Burst traffic simulation
  burst_test: {
    executor: 'per-vu-iterations',
    vus: 5,
    iterations: 10,
    exec: 'burstScenario',
    maxDuration: '2m'
  },
  
  // High-value workload
  premium_load: {
    executor: 'constant-arrival-rate',
    rate: 2, // 2 requests per second
    timeUnit: '1s',
    duration: '3m',
    preAllocatedVUs: 5,
    exec: 'highValueScenario'
  }
};