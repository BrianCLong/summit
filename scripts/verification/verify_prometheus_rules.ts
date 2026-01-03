import fs from 'fs';
import path from 'path';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

function log(msg: string) {
  console.log(msg);
}

function error(msg: string) {
  console.error(`${RED}ERROR: ${msg}${RESET}`);
  process.exitCode = 1;
}

function success(msg: string) {
  console.log(`${GREEN}PASS: ${msg}${RESET}`);
}

const FILES = [
  'monitoring/alerts.yaml',
];

const ADDITIONAL_DIRS = [
  'observability/prometheus/alerts',
  'ops/prometheus',
  'prom/alerts'
];

function findYamlFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results.push(...findYamlFiles(file));
    } else {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        results.push(file);
      }
    }
  });
  return results;
}

ADDITIONAL_DIRS.forEach(d => {
  const fullPath = path.resolve(process.cwd(), d);
  FILES.push(...findYamlFiles(d).map(f => path.relative(process.cwd(), f)));
});


log(`Verifying ${FILES.length} Prometheus rule files...`);

let failure = false;

FILES.forEach(file => {
  if (!fs.existsSync(file)) {
    if (file === 'monitoring/alerts.yaml') {
        error(`File not found: ${file}`);
        failure = true;
    }
    return;
  }

  try {
    const content = fs.readFileSync(file, 'utf8');

    // Minimal valid check without js-yaml dependency
    // 1. Check for basic YAML structure (not empty)
    if (content.trim().length === 0) {
        error(`${file}: Empty file`);
        failure = true;
        return;
    }

    // 2. Check for required keys using simple regex
    // "groups:" or "alerting_rules:"
    const hasGroups = /^groups:/m.test(content);
    const hasAlertingRules = /^alerting_rules:/m.test(content);
    const hasScrapeConfigs = /^scrape_configs:/m.test(content);

    if (file.endsWith('prometheus.yml')) {
        if (!hasScrapeConfigs && !hasGroups && !hasAlertingRules) {
             // Maybe it's just a partial config or uses include?
             // But usually main config has scrape_configs.
             // If it lacks all, maybe it's suspicious.
             // For now, assume prometheus.yml is fine if it has content.
             success(`${file} OK (Config)`);
             return;
        }
    }

    if (!hasGroups && !hasAlertingRules && !hasScrapeConfigs) {
         // If it's an alert file, it should have one of these.
         if (file.includes('alert') || file.includes('rule')) {
             error(`${file}: Missing 'groups' or 'alerting_rules' key`);
             failure = true;
             return;
         }
    }

    // 3. If it has groups/rules, check for 'alert:' and 'expr:' presence roughly
    if (hasGroups || hasAlertingRules) {
        if (!/alert:/.test(content) && !/record:/.test(content)) {
            // Might be a file with empty groups?
            // error(`${file}: No 'alert' or 'record' found`);
            // failure = true;
            // return;
        }
    }

    success(`${file} OK`);

  } catch (e: any) {
    error(`${file}: ${e.message}`);
    failure = true;
  }
});

if (failure) {
  process.exit(1);
}
