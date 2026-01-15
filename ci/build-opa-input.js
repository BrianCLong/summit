// Build OPA input from GitHub Actions context.
// Usage: node ci/build-opa-input.js "$GITHUB_EVENT_PATH" > ci/input.json

import fs from 'fs';

function main() {
  const eventPath = process.argv[2];
  if (!eventPath) {
    process.stderr.write("Usage: node ci/build-opa-input.js <event-path>\n");
    process.exit(1);
  }

  const raw = fs.readFileSync(eventPath, "utf8");
  const event = JSON.parse(raw);

  const env = process.env.DEPLOY_ENV || "dev";

  const pr = event.pull_request || {};
  const labels = (pr.labels || []).map((label) => label.name || label);
  const approvals = (event.review || {}).state === "approved" ? 1 : 0;

  const checks = [];

  const sbomSigned = process.env.SUMMIT_SBOM_SIGNED === "true";
  const securityFailures = process.env.SUMMIT_SECURITY_FAILURES
    ? process.env.SUMMIT_SECURITY_FAILURES.split(",").filter(Boolean)
    : [];

  const input = {
    env,
    pr: {
      approvals,
      labels,
      checks
    },
    artifact: {
      sbom: {
        signed: sbomSigned
      }
    },
    security: {
      failures: securityFailures
    }
  };

  process.stdout.write(`${JSON.stringify(input, null, 2)}\n`);
}

main();
