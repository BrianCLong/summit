import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const dir = process.argv[2] || 'artifacts/evidence_test';
  console.log(`Scanning artifacts in ${dir}...`);

  if (!fs.existsSync(dir)) {
      console.log(`Directory ${dir} does not exist. Skipping.`);
      return;
  }

  const secretsPatterns = [
      /sk-[a-zA-Z0-9]{32,}/, // OpenAI key like
      /ghp_[a-zA-Z0-9]{36}/, // GitHub token
      /password/i,
      /secret/i
  ];

  let hasSecrets = false;

  function scanDir(directory: string) {
      const files = fs.readdirSync(directory);
      for (const file of files) {
          const fullPath = path.join(directory, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
              scanDir(fullPath);
          } else {
              const content = fs.readFileSync(fullPath, 'utf-8');
              for (const pattern of secretsPatterns) {
                  if (pattern.test(content)) {
                      console.error(`[Security] Potential secret found in ${fullPath}: matches ${pattern}`);
                      hasSecrets = true;
                  }
              }
          }
      }
  }

  scanDir(dir);

  if (hasSecrets) {
      console.error("Security scan failed: Secrets detected.");
      process.exit(1);
  }

  console.log("No secrets found.");
}

main().catch(console.error);
