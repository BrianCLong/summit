import * as fs from "fs";
import * as path from "path";

// Signatures mapping to owners
const SIGNATURES = {
  ERR_MODULE_NOT_FOUND: { category: "Systemic (ESM)", owner: "Claude" },
  "Duplicate metric": { category: "Observability (Prometheus)", owner: "Qwen" },
  "Connection already active": { category: "Infrastructure (DB/Redis)", owner: "Qwen" },
  ECONNREFUSED: { category: "Network/Env", owner: "Claude" },
  "Jest worker encountered": { category: "Test Runtime", owner: "Claude" },
  "Command failed": { category: "Generic Build", owner: "Author" },
};

function scanLogs() {
  // In a real env, this would read from `gh run view --log` or downloaded artifacts.
  // Here, we look for a 'ci-logs.txt' or specific log files in standard locations.

  const logDir = path.join(process.cwd(), "ci_logs"); // hypothetical
  if (!fs.existsSync(logDir)) {
    console.log("No ci_logs directory found. Please download CI logs to ./ci_logs/ to analyze.");
    // Create a dummy output for demonstration if no logs exist
    console.log("--- Demonstration Mode ---");
    console.log("Analyzing hypothetical failures...");
    analyzeLogContent(
      "Error: ERR_MODULE_NOT_FOUND\nError: Duplicate metric 'http_request_duration'"
    );
    return;
  }

  const files = fs.readdirSync(logDir);
  files.forEach((file) => {
    const content = fs.readFileSync(path.join(logDir, file), "utf-8");
    analyzeLogContent(content, file);
  });
}

function analyzeLogContent(content: string, source: string = "Sample") {
  const findings: Record<string, number> = {};

  Object.entries(SIGNATURES).forEach(([sig, info]) => {
    if (content.includes(sig)) {
      const key = `[${info.category}] ${sig} -> ${info.owner}`;
      findings[key] = (findings[key] || 0) + 1;
    }
  });

  if (Object.keys(findings).length > 0) {
    console.log(`\nFindings in ${source}:`);
    Object.entries(findings).forEach(([k, v]) => console.log(`- ${v}x ${k}`));
  }
}

scanLogs();
