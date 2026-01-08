import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'module';
import { z } from 'zod';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const glob = require('glob');

const PolicySchema = z.object({
  denylist: z.object({
    patterns: z.array(z.string()),
  }),
  allowlist: z.object({
    fields: z.array(z.string()).optional(),
    exceptions: z.array(z.string()).optional(),
  }).optional(),
});

async function main() {
  const args = process.argv.slice(2);
  // Usage: <report_dir> <policy_file>
  if (args.length < 2) {
    console.error('Usage: tsx verify_pilot_report_no_leak.ts <report_dir> <policy_file>');
    process.exit(1);
  }

  const [reportDir, policyPath] = args;

  if (!fs.existsSync(policyPath)) {
    console.error(`Policy file not found: ${policyPath}`);
    process.exit(1);
  }

  const policy = yaml.load(fs.readFileSync(policyPath, 'utf8'));

  // Validate policy schema
  try {
    PolicySchema.parse(policy);
  } catch(e) {
    console.error('Invalid policy file format');
    process.exit(1);
  }

  const patterns = policy.denylist.patterns.map((p: string) => new RegExp(p));
  const exceptions = (policy.allowlist?.exceptions || []).map((p: string) => new RegExp(p));

  // NOTE: In a real implementation, we would parse JSON files and skip allowed keys.
  // For MD/HTML, we check the whole file but allow exceptions.

  const files = glob.sync(`${reportDir}/**/*.{json,md,html}`);
  let leakFound = false;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');

    // Check line by line to allow exception matching (simple heuristic)
    // Or match against the whole content and see if the match is exempted.

    // Better approach: If a pattern matches, check if the matching string is covered by an exception.

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        // We found a match. Is it allowed?
        // Check if the matching segment matches any exception regex
        const matchedString = match[0];
        let isAllowed = false;

        for (const exception of exceptions) {
          if (exception.test(matchedString)) {
            isAllowed = true;
            break;
          }
        }

        if (!isAllowed) {
            console.error(`❌ LEAK DETECTED in ${file}: Matches pattern ${pattern} (Found: "${matchedString}")`);
            leakFound = true;
        }
      }
    }

    // Check for PII heuristics (e.g. emails)
    // Simple email regex - can be tuned
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    let emailMatch;
    while ((emailMatch = emailRegex.exec(content)) !== null) {
        const email = emailMatch[0];
        let isAllowed = false;
        for (const exception of exceptions) {
            if (exception.test(email)) {
                isAllowed = true;
                break;
            }
        }
        if (!isAllowed) {
            console.error(`❌ LEAK DETECTED in ${file}: Possible email address found: ${email}`);
            leakFound = true;
        }
    }
  }

  if (leakFound) {
    console.error('Verification FAILED: Sensitive data detected.');
    process.exit(1);
  } else {
    console.log('✅ No leaks detected. Artifacts are safe to publish.');
  }
}

main();
