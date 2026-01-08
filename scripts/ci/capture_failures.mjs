import fs from 'fs';
import yaml from 'js-yaml';

const KNOWN_FLAKES_FILE = 'docs/ci/KNOWN_FLAKES.yml';

function loadRegistry() {
  if (!fs.existsSync(KNOWN_FLAKES_FILE)) {
    console.error(`Warning: ${KNOWN_FLAKES_FILE} not found.`);
    return [];
  }
  try {
    return yaml.load(fs.readFileSync(KNOWN_FLAKES_FILE, 'utf8'));
  } catch (e) {
    console.error(`Error loading registry: ${e.message}`);
    return [];
  }
}

function isExpired(dateStr) {
  return new Date(dateStr) < new Date(new Date().toISOString().split('T')[0]);
}

function matchFailures(failures, flakes) {
  const matches = [];

  for (const failure of failures) {
    for (const flake of flakes) {
      // Simple inclusion or regex match
      let matched = false;
      if (flake.test_selector.startsWith('/') && flake.test_selector.endsWith('/')) {
        // Regex
        try {
          const regex = new RegExp(flake.test_selector.slice(1, -1));
          if (regex.test(failure)) matched = true;
        } catch (e) {
          console.error(`Invalid regex in flake ${flake.id}: ${flake.test_selector}`);
        }
      } else {
        // String contains
        if (failure.includes(flake.test_selector)) matched = true;
      }

      if (matched) {
        matches.push({
          testName: failure,
          flake: flake,
          isExpired: isExpired(flake.expires_on)
        });
      }
    }
  }
  return matches;
}

function generateMarkdown(matches) {
  if (matches.length === 0) return '';

  let md = `\n## ❄️ Known Flakes Matches\n\n`;
  md += `The following failures match known flaky tests. Failures are still genuine, but context is provided below.\n\n`;

  for (const match of matches) {
    const icon = match.isExpired ? '⚠️ **EXPIRED**' : 'ℹ️';
    md += `### ${icon} ${match.flake.id}: ${match.flake.symptom}\n`;
    md += `- **Test:** \`${match.testName}\`\n`;
    md += `- **Owner:** ${match.flake.owner}\n`;
    md += `- **Ticket:** [${match.flake.ticket}](${match.flake.ticket})\n`;
    md += `- **Expires:** ${match.flake.expires_on}\n`;
    if (match.isExpired) {
        md += `\n> **WARNING:** This flake entry has expired. Please update the registry or fix the test.\n`;
    }
    md += `\n**Reproduction:**\n\`\`\`bash\n${match.flake.repro}\n\`\`\`\n`;
    if (match.flake.mitigation_notes) {
      md += `**Notes:** ${match.flake.mitigation_notes}\n`;
    }
    md += `\n---\n`;
  }
  return md;
}

async function main() {
  const failureFile = process.argv[2];
  let failures = [];

  if (failureFile && fs.existsSync(failureFile)) {
    const content = fs.readFileSync(failureFile, 'utf8');
    failures = content.split('\n').map(l => l.trim()).filter(l => l);
  } else {
    // Attempt to read from stdin if no file provided
    if (process.stdin.isTTY) {
        // No input
    } else {
        try {
             const stdinBuffer = fs.readFileSync(0, 'utf8');
             failures = stdinBuffer.split('\n').map(l => l.trim()).filter(l => l);
        } catch (e) {
            // Ignore error if stdin read fails
        }
    }
  }

  if (failures.length === 0 && process.argv.length < 3) {
      console.log("Usage: node capture_failures.mjs <failing_tests.txt>");
      return;
  }

  const flakes = loadRegistry();
  const matches = matchFailures(failures, flakes);
  const report = generateMarkdown(matches);

  if (report) {
    console.log(report);
    // Optionally append to a triage file if specified
    const outputFile = process.argv[3];
    if (outputFile) {
        fs.appendFileSync(outputFile, report);
        console.error(`Appended matches to ${outputFile}`);
    }
  }
}

main().catch(console.error);
