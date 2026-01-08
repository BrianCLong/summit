import { findFiles, loadFile } from "../fs-utils.js";
import { CheckResult } from "../types.js";

export const runProcessChecks = (root: string): CheckResult[] => {
  const results: CheckResult[] = [];
  const codeowners = findFiles(root, ["CODEOWNERS", ".github/CODEOWNERS"])[0];
  if (!codeowners) {
    results.push({
      epic: "Epic 9",
      requirement: "Reviewer policy",
      status: "fail",
      message: "CODEOWNERS file missing. High-risk areas require explicit approvers.",
      remediation: "Add CODEOWNERS rules for IAM, deploy, DNS, and authZ paths.",
    });
  } else {
    const content = loadFile(codeowners) ?? "";
    const requiredPaths = ["iam", "deploy", "dns", "authz"];
    const missingPaths = requiredPaths.filter((path) => !content.includes(path));
    if (missingPaths.length > 0) {
      results.push({
        epic: "Epic 9",
        requirement: "Reviewer policy",
        status: "fail",
        message: "CODEOWNERS missing coverage for sensitive paths.",
        remediation: "Add CODEOWNERS entries for sensitive paths with two-person rule.",
        details: { missingPaths },
      });
    } else {
      results.push({
        epic: "Epic 9",
        requirement: "Reviewer policy",
        status: "pass",
        message: "Sensitive paths have CODEOWNERS coverage.",
      });
    }
  }

  const trainingMaterials = findFiles(root, [
    "runbooks/tabletop/**/*",
    "runbooks/**/*tabletop*.*",
    "training/**/*security*.*",
  ]);
  if (trainingMaterials.length === 0) {
    results.push({
      epic: "Epic 9",
      requirement: "Tabletop and training",
      status: "fail",
      message: "No tabletop drills or training materials detected.",
      remediation:
        "Add tabletop runbooks (token leak, supply-chain compromise) and training content.",
    });
  } else {
    results.push({
      epic: "Epic 9",
      requirement: "Tabletop and training",
      status: "pass",
      message: "Tabletop drills/training content available.",
      details: { trainingMaterials },
    });
  }

  return results;
};
