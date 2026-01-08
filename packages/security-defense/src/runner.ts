import path from "path";
import { runSupplyChainChecks } from "./checks/supplyChain.js";
import { runCiCdChecks } from "./checks/ciCd.js";
import { runSecretsChecks } from "./checks/secrets.js";
import { runIamChecks } from "./checks/iam.js";
import { runKubernetesChecks } from "./checks/kubernetes.js";
import { runNetworkChecks } from "./checks/network.js";
import { runObservabilityChecks } from "./checks/observability.js";
import { runAppSecurityChecks } from "./checks/appSecurity.js";
import { runProcessChecks } from "./checks/process.js";
import { CheckResult, RunnerOptions } from "./types.js";

export const runAllChecks = (options: RunnerOptions = {}): CheckResult[] => {
  const root = options.rootDir ? path.resolve(options.rootDir) : process.cwd();
  const now = options.now ?? new Date();

  return [
    ...runSupplyChainChecks(root, options.sbomBaselinePath, options.sbomTargetPath),
    ...runCiCdChecks(root),
    ...runSecretsChecks(root, now, options.rotationThresholdDays),
    ...runIamChecks(root),
    ...runKubernetesChecks(root),
    ...runNetworkChecks(root),
    ...runObservabilityChecks(root),
    ...runAppSecurityChecks(root),
    ...runProcessChecks(root),
  ];
};

export const summarizeResults = (results: CheckResult[]) => {
  const failures = results.filter((result) => result.status === "fail");
  const passes = results.filter((result) => result.status === "pass");
  return {
    total: results.length,
    failures,
    passes,
    score: Math.round(((results.length - failures.length) / Math.max(results.length, 1)) * 100),
  };
};
