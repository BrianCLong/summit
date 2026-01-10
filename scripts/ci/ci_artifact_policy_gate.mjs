
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

export function verifyArtifactPolicy(targetDir = process.cwd()) {
    const WORKFLOWS_DIR = join(targetDir, '.github/workflows');
    const POLICY_FILE = join(targetDir, 'policy/ci_artifacts.policy.yml');
    if (!existsSync(POLICY_FILE)) return true;
    const policy = yaml.load(readFileSync(POLICY_FILE, 'utf8'));
    const files = readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    let violations = [];
    files.forEach(file => {
        try {
            const doc = yaml.load(readFileSync(join(WORKFLOWS_DIR, file), 'utf8'));
            if (!doc || !doc.jobs) return;
            Object.entries(doc.jobs).forEach(([jobName, job]) => {
                if (!job.steps) return;
                job.steps.forEach((step, idx) => {
                    if (step.uses && step.uses.includes('actions/upload-artifact')) {
                        const retention = step.with?.['retention-days'];
                        if (policy.enforcement.require_retention_days && retention === undefined) {
                            violations.push({ file, location: `${jobName}.step[${idx}]`, issue: 'Missing retention-days' });
                        } else if (retention !== undefined && parseInt(retention) > policy.enforcement.max_allowed_retention) {
                            violations.push({ file, location: `${jobName}.step[${idx}]`, issue: `Retention ${retention} > ${policy.enforcement.max_allowed_retention}` });
                        }
                    }
                });
            });
        } catch (e) { }
    });
    if (violations.length > 0) {
        console.error('❌ CI Artifact Policy Violations:');
        violations.forEach(v => console.error(`   - [${v.file}] ${v.location}: ${v.issue}`));
        return false;
    }
    return true;
}
