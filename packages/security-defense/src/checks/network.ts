import YAML from "yaml";
import { findFiles, loadFile } from "../fs-utils.js";
import { CheckResult } from "../types.js";

const networkPolicyPatterns = ["k8s/network/**/*.{yml,yaml}", "**/networkpolicy*.{yml,yaml}"];

const isDefaultDeny = (policy: any): boolean => {
  const types = policy?.spec?.policyTypes ?? [];
  const hasIngressDeny =
    types.includes("Ingress") && (!policy.spec.ingress || policy.spec.ingress.length === 0);
  const hasEgressDeny =
    types.includes("Egress") && (!policy.spec.egress || policy.spec.egress.length === 0);
  return hasIngressDeny && hasEgressDeny;
};

export const runNetworkChecks = (root: string): CheckResult[] => {
  const results: CheckResult[] = [];
  const files = findFiles(root, networkPolicyPatterns);
  if (files.length === 0) {
    results.push({
      epic: "Epic 6",
      requirement: "Network policy coverage",
      status: "fail",
      message:
        "No NetworkPolicy resources found. Default-deny policies are required per namespace.",
      remediation: "Add default-deny ingress and egress NetworkPolicies with explicit allowlists.",
    });
    return results;
  }

  let defaultDenyCount = 0;
  files.forEach((file) => {
    const content = loadFile(file);
    if (!content) return;
    YAML.parseAllDocuments(content)
      .map((doc) => doc.toJSON())
      .filter((doc) => doc?.kind === "NetworkPolicy")
      .forEach((policy) => {
        if (isDefaultDeny(policy)) {
          defaultDenyCount += 1;
        }
      });
  });

  if (defaultDenyCount === 0) {
    results.push({
      epic: "Epic 6",
      requirement: "Default-deny posture",
      status: "fail",
      message: "No default-deny ingress+egress policies detected.",
      remediation: "Add NetworkPolicies that deny by default and allow only required flows.",
    });
  } else {
    results.push({
      epic: "Epic 6",
      requirement: "Default-deny posture",
      status: "pass",
      message: `Detected ${defaultDenyCount} default-deny NetworkPolicy resources.`,
    });
  }

  return results;
};
