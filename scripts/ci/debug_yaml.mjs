
import yaml from 'js-yaml';
import { readFileSync } from 'node:fs';
try {
    const content = readFileSync('.github/workflows/release-ops-slo-issue.yml', 'utf8');
    yaml.load(content);
    console.log('✅ Parsed successfully');
} catch (e) {
    console.error(e);
}
