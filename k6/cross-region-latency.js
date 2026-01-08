import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

// Define a custom trend metric for latency
const latencyTrend = new Trend("latency");

export const options = {
  // Read the target region from an environment variable, with a default
  // This allows the script to be parameterized in different execution environments.
  ext: {
    loadimpact: {
      projectID: 12345,
      name: `Cross-Region Latency Test - ${__ENV.REGION || "us-east-1"}`,
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests must complete within 500ms
    latency: ["p(95)<500"],
  },
  stages: [
    { duration: "30s", target: 10 }, // Ramp up to 10 virtual users over 30s
    { duration: "1m", target: 10 }, // Stay at 10 VUs for 1 minute
    { duration: "30s", target: 0 }, // Ramp down to 0 VUs
  ],
};

export default function () {
  const region = __ENV.REGION || "us-east-1";
  const endpointUrl = `https://api.${region}.summit.com`;

  // Simulate a user accessing a health endpoint
  const res = http.get(`${endpointUrl}/health`);

  // Check if the request was successful
  check(res, {
    "status is 200": (r) => r.status === 200,
  });

  // Add the request duration to our custom latency trend
  latencyTrend.add(res.timings.duration);

  // Simulate a user pausing between requests
  sleep(1);
}
