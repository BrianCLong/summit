// scripts/sec/watch_mcp_advisories.ts

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KNOWN_VULNERABLE_VERSIONS: Record<string, string[]> = {
  '@modelcontextprotocol/sdk': ['0.1.0', '0.2.0'], // Hypothetical
  'git-mcp': ['0.1.0'] // Example from the prompt (Anthropic Git MCP server incident)
};

async function checkAdvisories() {
  console.log('🛡️  Scanning for MCP supply-chain advisories...');

  const rootPackageJsonPath = path.resolve(__dirname, '../../package.json');
  if (!fs.existsSync(rootPackageJsonPath)) {
    console.error('❌ Could not find package.json');
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.pnpm?.overrides // Check overrides too
  };

  let foundIssues = false;

  for (const [pkg, version] of Object.entries(allDeps)) {
    if (KNOWN_VULNERABLE_VERSIONS[pkg]) {
      // Very basic version check (string match for now)
      // In a real script, use semver logic
      const vulnerableVersions = KNOWN_VULNERABLE_VERSIONS[pkg];
      if (vulnerableVersions.includes(version as string)) {
        console.error(`🚨 DETECTED VULNERABLE PACKAGE: ${pkg}@${version}`);
        console.error(`   Advisory: Known critical vulnerability in this version.`);
        foundIssues = true;
      } else {
         console.log(`✅ Checked ${pkg}: version ${version} appears safe.`);
      }
    }
  }

  // Also check for specific lockfile entries if needed (mocked here)

  if (foundIssues) {
    console.error('❌ Security check failed. Please upgrade vulnerable packages.');
    process.exit(1);
  } else {
    console.log('✅ No known MCP advisories found in direct dependencies.');
  }
}

// Allow running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkAdvisories().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export { checkAdvisories };
