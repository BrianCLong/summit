import { differenceInCalendarDays, parseISO } from "date-fns";
import { findFiles, readJsonFile, loadFile } from "../fs-utils.js";
import { CheckResult } from "../types.js";

type SecretInventoryEntry = {
  name: string;
  lastRotated: string;
  owner: string;
  sensitivity?: "high" | "medium" | "low";
};

type SecretInventory = SecretInventoryEntry[];

const secretPatterns = ["**/*.env", "**/*secrets*.json", "**/*credentials*.txt"];
const secretRegexes = [
  /(AWS|GCP|AZURE)[_-]?(SECRET|ACCESS)[_-]?KEY/i,
  /AIza[0-9A-Za-z\-_]{35}/, // Google API key
  /xox[baprs]-[0-9A-Za-z-]+/, // Slack token
  /ghp_[0-9A-Za-z]{36}/, // GitHub token
];

export const runSecretsChecks = (
  root: string,
  now: Date,
  rotationThresholdDays = 90
): CheckResult[] => {
  const results: CheckResult[] = [];
  const inventoryPath = findFiles(root, [
    "security/secret-inventory.json",
    "security/secrets.json",
  ])[0];
  const inventory = inventoryPath ? readJsonFile<SecretInventory>(inventoryPath) : null;

  if (!inventory) {
    results.push({
      epic: "Epic 3",
      requirement: "Secret inventory",
      status: "fail",
      message:
        "No secret inventory found. Inventory secrets across GitHub, AWS, K8s, apps, and SaaS.",
      remediation: "Create security/secret-inventory.json with owner and lastRotated metadata.",
    });
  } else {
    const staleSecrets = inventory.filter(
      (entry) => differenceInCalendarDays(now, parseISO(entry.lastRotated)) > rotationThresholdDays
    );
    if (staleSecrets.length > 0) {
      results.push({
        epic: "Epic 3",
        requirement: "Rotation cadence",
        status: "fail",
        message: "Secrets have exceeded the rotation threshold.",
        remediation: "Rotate high-value secrets and update lastRotated to satisfy the SLO.",
        details: { staleSecrets },
      });
    } else {
      results.push({
        epic: "Epic 3",
        requirement: "Rotation cadence",
        status: "pass",
        message: "All inventoried secrets meet the rotation SLO.",
      });
    }
  }

  const potentialSecrets: { file: string; line: number; match: string }[] = [];
  const candidates = findFiles(root, secretPatterns);
  candidates.forEach((file) => {
    const content = loadFile(file);
    if (!content) return;
    content.split(/\r?\n/).forEach((line, idx) => {
      secretRegexes.forEach((regex) => {
        if (regex.test(line)) {
          potentialSecrets.push({ file, line: idx + 1, match: line.trim() });
        }
      });
    });
  });

  if (potentialSecrets.length > 0) {
    results.push({
      epic: "Epic 3",
      requirement: "Secret scanning",
      status: "fail",
      message: "Potential hard-coded secrets detected.",
      remediation: "Remove hard-coded secrets and use dynamic retrieval with scoped roles.",
      details: { potentialSecrets },
    });
  } else {
    results.push({
      epic: "Epic 3",
      requirement: "Secret scanning",
      status: "pass",
      message: "No hard-coded secrets detected in tracked files.",
    });
  }

  return results;
};
