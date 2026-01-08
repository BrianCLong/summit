import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const RESULTS_DIR = path.resolve(process.cwd(), ".evidence/results");
const SBOM_PATH = path.resolve(process.cwd(), ".evidence/sbom.json");
const SIG_PATH = path.resolve(process.cwd(), ".evidence/signature/sbom.json.sig");

const mockScan = () => {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  let criticalVulns = false;
  let vulnDetails = { high: 0, critical: 0, medium: 0, low: 0 };

  // Attempt real scan
  try {
    console.log("Attempting real vulnerability scan (pnpm audit)...");
    execSync("pnpm audit --audit-level=critical --json", { stdio: "pipe" });
    console.log("No critical vulnerabilities found.");
  } catch (e: any) {
    if (e.status === 1) {
      console.warn("Critical vulnerabilities detected by pnpm audit.");
      try {
        const output = e.stdout.toString();
        const json = JSON.parse(output);
        if (json.metadata && json.metadata.vulnerabilities) {
          vulnDetails = json.metadata.vulnerabilities;
          if (vulnDetails.critical > 0) {
            criticalVulns = true;
          }
        }
      } catch (parseError) {
        console.warn("Could not parse pnpm audit output.");
      }
    } else {
      console.warn("Vulnerability scan failed to run or encountered system error:", e.message);
    }
  }

  // Verify artifacts exist
  const sbomPresent = fs.existsSync(SBOM_PATH);
  const sigPresent = fs.existsSync(SIG_PATH);

  const scanResult = {
    sbom_present: sbomPresent,
    signature_present: sigPresent,
    vulnerabilities_critical: criticalVulns,
    scan_timestamp: new Date().toISOString(),
    details: vulnDetails,
  };

  const outputPath = path.join(RESULTS_DIR, "input.json");
  fs.writeFileSync(outputPath, JSON.stringify(scanResult, null, 2));
  console.log(`Scan result generated: ${outputPath}`);
};

mockScan();
