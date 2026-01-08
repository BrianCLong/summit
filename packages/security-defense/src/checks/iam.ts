import { findFiles, loadFile } from "../fs-utils.js";
import { CheckResult } from "../types.js";

const wildcardRegex = /"Action"\s*:\s*"\*"|\ballows\s*:\s*\*/i;
const breakglassRegex = /break[-_]?glass/i;

export const runIamChecks = (root: string): CheckResult[] => {
  const results: CheckResult[] = [];
  const iamFiles = findFiles(root, [
    "policies/**/*.{json,rego}",
    "iam/**/*.{json,rego}",
    "terraform/**/*.{tf,json}",
  ]);

  if (iamFiles.length === 0) {
    results.push({
      epic: "Epic 4",
      requirement: "IAM policy coverage",
      status: "fail",
      message: "No IAM policy artifacts detected to validate boundary roles.",
      remediation:
        "Store IAM boundary policies under policies/ or terraform/ for automated validation.",
    });
    return results;
  }

  const wildcardFindings: string[] = [];
  const missingBreakglassDeny: string[] = [];

  iamFiles.forEach((file) => {
    const content = loadFile(file) ?? "";
    if (wildcardRegex.test(content)) {
      wildcardFindings.push(file);
    }
    if (!breakglassRegex.test(content)) {
      missingBreakglassDeny.push(file);
    }
  });

  if (wildcardFindings.length > 0) {
    results.push({
      epic: "Epic 4",
      requirement: "No wildcard admin",
      status: "fail",
      message: "Wildcard IAM actions detected.",
      remediation:
        "Replace wildcard admin permissions with explicit scoped actions per environment.",
      details: { wildcardFindings },
    });
  } else {
    results.push({
      epic: "Epic 4",
      requirement: "No wildcard admin",
      status: "pass",
      message: "No wildcard IAM permissions detected.",
    });
  }

  if (missingBreakglassDeny.length > 0) {
    results.push({
      epic: "Epic 4",
      requirement: "Break-glass explicitness",
      status: "fail",
      message: "Policies missing break-glass clauses to constrain scope.",
      remediation: "Add explicit break-glass conditions with expiry and audit requirements.",
      details: { missingBreakglassDeny },
    });
  } else {
    results.push({
      epic: "Epic 4",
      requirement: "Break-glass explicitness",
      status: "pass",
      message: "All policies declare break-glass constraints.",
    });
  }

  return results;
};
