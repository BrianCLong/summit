// k6 Load Test for Conductor Routing Hot Paths
// Tests routing performance under various load conditions

import http from "k6/http";
import { sleep, check } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// Custom metrics
export const routingErrors = new Rate("routing_errors");
export const routingLatency = new Trend("routing_latency");
export const routingThroughput = new Counter("routing_requests");
export const expertSelectionDistribution = new Counter("expert_selection");

// Load test configuration
export const options = {
  stages: [
    { duration: "30s", target: 5 },    // Ramp up to 5 users
    { duration: "1m", target: 10 },    // Stay at 10 users
    { duration: "2m", target: 25 },    // Ramp up to 25 users  
    { duration: "3m", target: 50 },    // Peak load at 50 users
    { duration: "2m", target: 25 },    // Ramp down to 25 users
    { duration: "1m", target: 10 },    // Ramp down to 10 users
    { duration: "30s", target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    // Core performance thresholds
    http_req_failed: ["rate<0.01"],          // Error rate < 1%
    http_req_duration: ["p(95)<800"],        // 95th percentile < 800ms
    http_req_duration: ["p(99)<1200"],       // 99th percentile < 1.2s
    
    // Conductor-specific thresholds
    routing_errors: ["rate<0.005"],          // Routing error rate < 0.5%
    routing_latency: ["p(95)<600"],          // Routing latency 95th percentile < 600ms
    routing_latency: ["avg<300"],            // Average routing latency < 300ms
    
    // Checks
    checks: ["rate>0.98"],                   // Check success rate > 98%
  },
  // Resource limits
  noConnectionReuse: false,
  userAgent: "k6-conductor-load-test/1.0",
};

// Configuration
const SRV = __ENV.SRV || "http://localhost:4000/graphql";
const headers = { 
  "content-type": "application/json",
  "user-agent": "k6-conductor-load-test/1.0"
};

// Test scenarios with different routing patterns
const scenarios = [
  // Graph-heavy queries (should route to GRAPH_TOOL)
  {
    name: "graph_heavy",
    weight: 30,
    query: "Find all connections between suspicious entities in the last 30 days using graph algorithms",
    expectedExpert: "GRAPH_TOOL"
  },
  
  // LLM light queries (should route to LLM_LIGHT)
  {
    name: "llm_light", 
    weight: 25,
    query: "Summarize this brief intelligence report in 2-3 sentences",
    expectedExpert: "LLM_LIGHT"
  },
  
  // LLM heavy queries (should route to LLM_HEAVY)
  {
    name: "llm_heavy",
    weight: 20,
    query: "Analyze this complex geopolitical situation and provide detailed strategic recommendations with multiple scenarios and risk assessments",
    expectedExpert: "LLM_HEAVY"
  },
  
  // RAG queries (should route to RAG_TOOL)
  {
    name: "rag_search",
    weight: 15,
    query: "Search our knowledge base for information about cyber threat actors and their recent campaigns",
    expectedExpert: "RAG_TOOL"
  },
  
  // Files operations (should route to FILES_TOOL)
  {
    name: "files_ops",
    weight: 5,
    query: "Export the investigation results to PDF format with executive summary", 
    expectedExpert: "FILES_TOOL"
  },
  
  // OSINT queries (should route to OSINT_TOOL)
  {
    name: "osint_lookup",
    weight: 5,
    query: "Gather open source intelligence on this organization from social media and news sources",
    expectedExpert: "OSINT_TOOL"
  }
];

// Weighted random scenario selection
function selectScenario() {
  const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const scenario of scenarios) {
    random -= scenario.weight;
    if (random <= 0) {
      return scenario;
    }
  }
  return scenarios[0]; // Fallback
}

// Preview routing test
function testPreviewRouting(scenario) {
  const query = JSON.stringify({
    query: `
      query PreviewRouting($input: ConductInput!) { 
        previewRouting(input: $input) { 
          expert 
          reason 
          confidence 
          alternatives {
            expert
            confidence
          }
          features {
            complexity
            dataIntensity
            timeConstraint
          }
        } 
      }`,
    variables: {
      input: {
        task: scenario.query,
        maxLatencyMs: 30000,
        context: {}
      }
    }
  });

  const startTime = new Date();
  const response = http.post(SRV, query, { headers });
  const endTime = new Date();
  const latency = endTime - startTime;

  // Record metrics
  routingThroughput.add(1);
  routingLatency.add(latency);

  // Validate response
  const success = check(response, {
    "status is 200": (r) => r.status === 200,
    "has data": (r) => {
      try {
        const data = r.json();
        return data.data && data.data.previewRouting;
      } catch (e) {
        return false;
      }
    },
    "expert selected": (r) => {
      try {
        const data = r.json();
        return data.data.previewRouting.expert !== null;
      } catch (e) {
        return false;
      }
    },
    "confidence present": (r) => {
      try {
        const data = r.json();
        return typeof data.data.previewRouting.confidence === 'number';
      } catch (e) {
        return false;
      }
    },
    "response time OK": () => latency < 1000
  });

  if (!success) {
    routingErrors.add(1);
  }

  // Track expert selection distribution
  try {
    const data = response.json();
    if (data.data && data.data.previewRouting && data.data.previewRouting.expert) {
      expertSelectionDistribution.add(1, { expert: data.data.previewRouting.expert });
      
      // Optional: Check if routing matches expectation (for debugging)
      const selectedExpert = data.data.previewRouting.expert;
      if (selectedExpert === scenario.expectedExpert) {
        // Routing matched expectation
      }
    }
  } catch (e) {
    // JSON parsing error
    routingErrors.add(1);
  }

  return response;
}

// Conduct execution test (lighter load, more realistic)
function testConductExecution(scenario) {
  const query = JSON.stringify({
    query: `
      mutation Conduct($input: ConductInput!) { 
        conduct(input: $input) { 
          expertId 
          auditId 
          latencyMs 
          cost
          result
        } 
      }`,
    variables: {
      input: {
        task: scenario.query,
        maxLatencyMs: 30000,
        context: {}
      }
    }
  });

  const response = http.post(SRV, query, { headers });

  check(response, {
    "conduct status is 200": (r) => r.status === 200,
    "conduct has data": (r) => {
      try {
        const data = r.json();
        return data.data && data.data.conduct;
      } catch (e) {
        return false;
      }
    },
    "conduct has expert": (r) => {
      try {
        const data = r.json();
        return data.data.conduct.expertId !== null;
      } catch (e) {
        return false;
      }
    },
    "conduct has audit": (r) => {
      try {
        const data = r.json();
        return data.data.conduct.auditId !== null;
      } catch (e) {
        return false;
      }
    }
  });

  return response;
}

// Main test function - runs for each virtual user
export default function () {
  // Select a scenario based on weights
  const scenario = selectScenario();
  
  // 80% preview routing, 20% full execution (more realistic mix)
  if (Math.random() < 0.8) {
    testPreviewRouting(scenario);
  } else {
    testConductExecution(scenario);
  }

  // Think time between requests (realistic user behavior)
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds
}

// Setup function - runs once before the test
export function setup() {
  console.log("🚀 Starting Conductor load test...");
  console.log(`Target: ${SRV}`);
  console.log("Scenarios:", scenarios.map(s => `${s.name} (${s.weight}%)`).join(", "));
  
  // Health check before starting
  const healthCheck = http.get(`${SRV.replace('/graphql', '')}/health/conductor`);
  if (healthCheck.status !== 200) {
    throw new Error(`Health check failed: ${healthCheck.status}`);
  }
  
  return { timestamp: new Date().toISOString() };
}

// Teardown function - runs once after the test
export function teardown(data) {
  console.log("🏁 Conductor load test completed");
  console.log(`Started at: ${data.timestamp}`);
  console.log(`Ended at: ${new Date().toISOString()}`);
}