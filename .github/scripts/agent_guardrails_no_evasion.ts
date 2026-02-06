import * as fs from 'fs';
import * as path from 'path';

const SCAN_DIR = 'src/agents/itt';
const REQUIRED_IMPORT = 'guardrails';
const FORBIDDEN_TOOLS = ['child_process', 'exec', 'spawn', 'net', 'http'];

// Files that MUST import guardrails
const AGENT_FILES = ['insider.ts', 'defender.ts', 'beg.ts'];

function scanDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} does not exist, skipping scan.`);
    return;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Check for guardrails import in agent definitions
      // We check if the file is one of the known agent files OR if it explicitly exports a class ending in Agent
      if (AGENT_FILES.includes(file) || /class\s+\w+Agent/.test(content)) {
        if (!content.includes(REQUIRED_IMPORT)) {
           console.error(`ERROR: ${fullPath} is an agent but does not import guardrails.`);
           process.exit(1);
        }
      }

      // Check for forbidden tools
      for (const tool of FORBIDDEN_TOOLS) {
        if (content.includes(`import ${tool}`) || content.includes(`require('${tool}')`)) {
          console.error(`ERROR: Forbidden tool "${tool}" usage detected in ${fullPath}`);
          process.exit(1);
        }
      }
    }
  }
}

console.log("Starting Guardrails Scan...");
scanDirectory(SCAN_DIR);
console.log("Guardrails Scan Complete.");
