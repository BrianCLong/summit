import { findFiles, loadFile } from "../fs-utils.js";
import { CheckResult } from "../types.js";

export const runAppSecurityChecks = (root: string): CheckResult[] => {
  const results: CheckResult[] = [];
  const graphqlConfigs = findFiles(root, ["graphql/**/*.{json,yml,yaml}"]);

  if (graphqlConfigs.length === 0) {
    results.push({
      epic: "Epic 8",
      requirement: "GraphQL guardrails",
      status: "fail",
      message: "No GraphQL configuration detected for depth/complexity limits or rate limits.",
      remediation:
        "Add GraphQL server config with depth/complexity limits and persisted query enforcement.",
    });
  } else {
    const missingGuardrails: string[] = [];
    graphqlConfigs.forEach((file) => {
      const content = loadFile(file) ?? "";
      if (!/depthLimit/i.test(content) || !/complexity/i.test(content)) {
        missingGuardrails.push(file);
      }
      if (!/persisted/i.test(content) && !/persistedQueries/i.test(content)) {
        missingGuardrails.push(file);
      }
    });
    if (missingGuardrails.length > 0) {
      results.push({
        epic: "Epic 8",
        requirement: "GraphQL guardrails",
        status: "fail",
        message: "GraphQL configs missing depth/complexity or persisted query guardrails.",
        remediation: "Define depth, complexity, persisted queries, and per-identity rate limits.",
        details: { missingGuardrails },
      });
    } else {
      results.push({
        epic: "Epic 8",
        requirement: "GraphQL guardrails",
        status: "pass",
        message: "GraphQL guardrails detected (depth, complexity, persisted queries).",
      });
    }
  }

  const dlpConfigs = findFiles(root, [
    "observability/**/*redaction*.{yml,yaml,json}",
    "logging/**/*redaction*.{yml,yaml,json}",
  ]);
  if (dlpConfigs.length === 0) {
    results.push({
      epic: "Epic 8",
      requirement: "DLP and redaction",
      status: "fail",
      message: "No log redaction or DLP configuration found.",
      remediation: "Add redaction rules to prevent sensitive fields from reaching logs/telemetry.",
    });
  } else {
    results.push({
      epic: "Epic 8",
      requirement: "DLP and redaction",
      status: "pass",
      message: "Redaction/DLP configurations detected for telemetry.",
      details: { dlpConfigs },
    });
  }

  return results;
};
