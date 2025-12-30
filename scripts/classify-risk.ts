import fs from 'fs';
import path from 'path';

// Risk Levels
type RiskLevel = 'low' | 'medium' | 'high';

interface RiskClassification {
  level: RiskLevel;
  reasons: string[];
}

// Configuration
const HIGH_RISK_PATTERNS = [
  /^auth\//,
  /^security\//,
  /^crypto\//,
  /secret/,
  /password/,
  /credential/,
  /^server\/src\/auth/,
  /^server\/src\/security/,
  /\.env/,
];

const LOW_RISK_PATTERNS = [
  /^docs\//,
  /^README\.md$/,
  /\.md$/,
  /\.txt$/,
  /^LICENSE$/,
  /^\.gitignore$/,
];

export function classifyRisk(files: string[]): RiskClassification {
  const reasons: string[] = [];
  let hasHigh = false;
  let hasMedium = false; // Default is medium for code, but let's track explicitly

  if (files.length === 0) {
    return { level: 'low', reasons: ['No files changed'] };
  }

  for (const file of files) {
    // Check High Risk
    for (const pattern of HIGH_RISK_PATTERNS) {
      if (pattern.test(file)) {
        hasHigh = true;
        reasons.push(`High risk pattern matched: ${file} (${pattern})`);
      }
    }

    // Check Low Risk
    let isLow = false;
    for (const pattern of LOW_RISK_PATTERNS) {
      if (pattern.test(file)) {
        isLow = true;
      }
    }

    if (!isLow && !hasHigh) {
        hasMedium = true; // Any code file not explicitly low or high is medium
    }
  }

  if (hasHigh) {
    return { level: 'high', reasons };
  }

  if (hasMedium) {
    return { level: 'medium', reasons: ['Contains functional code changes'] };
  }

  return { level: 'low', reasons: ['Only documentation or safe files changed'] };
}

// Main execution if run as script
// Check if running directly or imported
// In ESM, import.meta.url is used.
if (import.meta.url === `file://${process.argv[1]}`) {
  // Read from stdin
  try {
    const input = fs.readFileSync(0, 'utf-8');
    const files = input.split('\n').map(f => f.trim()).filter(f => f.length > 0);

    const result = classifyRisk(files);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    // If reading stdin fails (e.g. TTY), just check args
     if (process.argv.length > 2) {
        const result = classifyRisk(process.argv.slice(2));
        console.log(JSON.stringify(result, null, 2));
     }
  }
}
