import YAML from "yaml";
import { findFiles, loadFile } from "../fs-utils.js";
import { CheckResult } from "../types.js";

const deploymentPatterns = ["k8s/**/*.{yml,yaml}", "**/kubernetes/**/*.{yml,yaml}"];

const evaluateWorkload = (doc: any, filePath: string, results: CheckResult[]) => {
  const spec = doc?.spec?.template?.spec || doc?.spec;
  if (!spec || (!spec.containers && !spec.template)) {
    return;
  }
  const containers = spec.containers ?? spec.template?.spec?.containers ?? [];
  containers.forEach((container: any) => {
    const securityContext = container.securityContext || {};
    if (securityContext.privileged) {
      results.push({
        epic: "Epic 5",
        requirement: "No privileged containers",
        status: "fail",
        message: "Privileged container detected.",
        remediation: "Drop privileged=true and restrict capabilities.",
        details: { filePath, container: container.name },
      });
    }
    if (securityContext.allowPrivilegeEscalation !== false) {
      results.push({
        epic: "Epic 5",
        requirement: "Disallow privilege escalation",
        status: "fail",
        message: "allowPrivilegeEscalation is not explicitly disabled.",
        remediation: "Set allowPrivilegeEscalation: false in container securityContext.",
        details: { filePath, container: container.name },
      });
    }
    if (securityContext.readOnlyRootFilesystem !== true) {
      results.push({
        epic: "Epic 5",
        requirement: "Read-only root filesystem",
        status: "fail",
        message: "Container root filesystem is not read-only.",
        remediation: "Set readOnlyRootFilesystem: true.",
        details: { filePath, container: container.name },
      });
    }
    if (!securityContext.runAsNonRoot) {
      results.push({
        epic: "Epic 5",
        requirement: "Run as non-root",
        status: "fail",
        message: "Container does not enforce runAsNonRoot.",
        remediation: "Set runAsNonRoot: true and specify a non-root UID.",
        details: { filePath, container: container.name },
      });
    }
  });

  const serviceAccount = spec.serviceAccountName || spec.serviceAccount;
  if (!serviceAccount || serviceAccount === "default") {
    results.push({
      epic: "Epic 5",
      requirement: "Dedicated service accounts",
      status: "fail",
      message: "Workload is using the default service account.",
      remediation: "Bind workloads to dedicated service accounts with least privilege.",
      details: { filePath },
    });
  }

  if (spec.hostNetwork || spec.hostPID) {
    results.push({
      epic: "Epic 5",
      requirement: "Block host namespace usage",
      status: "fail",
      message: "Workload uses host networking or PID namespace.",
      remediation: "Disable hostNetwork and hostPID unless explicitly approved.",
      details: { filePath },
    });
  }
};

export const runKubernetesChecks = (root: string): CheckResult[] => {
  const results: CheckResult[] = [];
  const manifests = findFiles(root, deploymentPatterns);
  if (manifests.length === 0) {
    results.push({
      epic: "Epic 5",
      requirement: "Kubernetes manifest coverage",
      status: "fail",
      message: "No Kubernetes manifests found to validate pod security.",
      remediation: "Store workload manifests under k8s/ for automated policy checks.",
    });
    return results;
  }

  manifests.forEach((file) => {
    const content = loadFile(file);
    if (!content) return;
    YAML.parseAllDocuments(content)
      .map((doc) => doc.toJSON())
      .filter(Boolean)
      .forEach((doc) => evaluateWorkload(doc, file, results));
  });

  if (!results.some((r) => r.status === "fail")) {
    results.push({
      epic: "Epic 5",
      requirement: "Baseline posture",
      status: "pass",
      message: "Kubernetes workloads satisfy non-root, read-only, and non-privileged baselines.",
    });
  }

  return results;
};
