import json
import os
import subprocess
import glob

def run_validation():
    violations = []
    # Using a programmatic approach with ajv in a temporary sandbox
    try:
        # Instead of calling the node script directly, let's create a temporary node project
        # that installs ajv and ajv-formats and runs the validation.
        script_dir = os.path.dirname(os.path.abspath(__file__))
        repo_root = os.path.abspath(os.path.join(script_dir, '..'))

        node_script = """
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

const schemasDir = path.resolve('%s/schemas');
const validFixturesDir = path.resolve('%s/fixtures/schemas/valid');
const invalidFixturesDir = path.resolve('%s/fixtures/schemas/invalid');

// Load dependent schemas first
const evidenceObjectSchemaPath = path.join(schemasDir, 'evidence_object.schema.json');
const evidenceObjectSchema = JSON.parse(fs.readFileSync(evidenceObjectSchemaPath, 'utf8'));
ajv.addSchema(evidenceObjectSchema, 'evidence_object.schema.json');

const schemaPaths = [
  path.join(schemasDir, 'investigation_run.schema.json'),
  evidenceObjectSchemaPath,
  path.join(schemasDir, 'evidence_bundle.schema.json'),
];

let failed = false;

for (const schemaPath of schemaPaths) {
  const schemaName = path.basename(schemaPath);
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const validate = ajv.compile(schema);

  const fixtureName = schemaName.replace('.schema.json', '.json');

  // Test valid fixtures
  const validFixturePath = path.join(validFixturesDir, fixtureName);
  if (fs.existsSync(validFixturePath)) {
    const data = JSON.parse(fs.readFileSync(validFixturePath, 'utf8'));
    const valid = validate(data);
    if (!valid) {
      console.error(`❌ Validation failed for VALID fixture: ${fixtureName}`);
      failed = true;
    }
  }

  // Test invalid fixtures
  const invalidFixturePath = path.join(invalidFixturesDir, fixtureName);
  if (fs.existsSync(invalidFixturePath)) {
    const data = JSON.parse(fs.readFileSync(invalidFixturePath, 'utf8'));
    const valid = validate(data);
    if (valid) {
      console.error(`❌ Validation passed for INVALID fixture (expected fail): ${fixtureName}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}
""" % (repo_root, repo_root, repo_root)

        os.makedirs('/tmp/ajv_test', exist_ok=True)
        with open('/tmp/ajv_test/package.json', 'w') as f:
            f.write('{"name":"ajv_test","type":"module"}')
        with open('/tmp/ajv_test/test.mjs', 'w') as f:
            f.write(node_script)

        subprocess.check_call(['npm', 'install', 'ajv', 'ajv-formats'], cwd='/tmp/ajv_test', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        try:
            subprocess.check_output(['node', 'test.mjs'], cwd='/tmp/ajv_test', stderr=subprocess.STDOUT, text=True)
        except subprocess.CalledProcessError as e:
            for line in e.output.split('\n'):
                if '❌ Validation failed for VALID fixture:' in line:
                    violations.append(line.split(':', 1)[1].strip())
                if '❌ Validation passed for INVALID fixture (expected fail):' in line:
                    violations.append(line.split(':', 1)[1].strip())
    except Exception as e:
        print(f"Validation error: {e}")

    return violations

def check_scope_drift(pr):
    title = pr.get('title', '').lower()
    labels = [l.get('name', '').lower() for l in pr.get('labels', [])]

    title_categories = set()
    if 'monitor' in title or 'observability' in title or 'telemetry' in title:
        title_categories.add('monitoring')
    if 'benchmark' in title or 'perf' in title:
        title_categories.add('benchmark_expansion')
    if 'adapter' in title or 'connector' in title:
        title_categories.add('adapters')
    if 'leaderboard' in title:
        title_categories.add('leaderboard')
    if 'research' in title or 'eval' in title or 'experiment' in title:
        title_categories.add('research')

    label_categories = set()
    for label in labels:
        if 'monitor' in label:
            label_categories.add('monitoring')
        elif 'benchmark' in label:
            label_categories.add('benchmark_expansion')
        elif 'adapter' in label:
            label_categories.add('adapters')
        elif 'leaderboard' in label:
            label_categories.add('leaderboard')
        elif 'research' in label:
            label_categories.add('research')

    if title_categories and label_categories and not title_categories.intersection(label_categories):
        return True

    return False

def get_prs():
    prs = []
    if os.path.exists('pr-open.json'):
        with open('pr-open.json') as f:
            try:
                prs.extend(json.load(f))
            except:
                pass
    if os.path.exists('prs.json'):
        with open('prs.json') as f:
            try:
                prs.extend(json.load(f))
            except:
                pass
    return prs

def build_report():
    prs = get_prs()
    report = {
        "monitoring": [],
        "benchmark_expansion": [],
        "adapters": [],
        "leaderboard": [],
        "research": [],
        "scope_drift": False,
        "duplicate_prs": False,
        "deterministic_artifact_violations": []
    }

    seen_titles = set()
    seen_scopes = set()

    for pr in prs:
        title = pr.get('title', '').lower()
        pr_num = str(pr.get('number', ''))
        head_ref = pr.get('headRefName', '')

        if title in seen_titles or (head_ref and head_ref in seen_scopes):
            report['duplicate_prs'] = True

        if title: seen_titles.add(title)
        if head_ref: seen_scopes.add(head_ref)

        if check_scope_drift(pr):
            report['scope_drift'] = True

        categorized = False
        if 'monitor' in title or 'observability' in title or 'telemetry' in title:
            report['monitoring'].append(pr_num)
            categorized = True
        if 'benchmark' in title or 'perf' in title:
            report['benchmark_expansion'].append(pr_num)
            categorized = True
        if 'adapter' in title or 'connector' in title:
            report['adapters'].append(pr_num)
            categorized = True
        if 'leaderboard' in title:
            report['leaderboard'].append(pr_num)
            categorized = True
        if 'research' in title or 'eval' in title or 'experiment' in title:
            report['research'].append(pr_num)
            categorized = True

        if not categorized:
            # Check labels
            labels = [l.get('name', '').lower() for l in pr.get('labels', [])]
            for label in labels:
                if 'monitor' in label:
                    report['monitoring'].append(pr_num)
                elif 'benchmark' in label:
                    report['benchmark_expansion'].append(pr_num)
                elif 'adapter' in label:
                    report['adapters'].append(pr_num)
                elif 'leaderboard' in label:
                    report['leaderboard'].append(pr_num)
                elif 'research' in label:
                    report['research'].append(pr_num)

    report['deterministic_artifact_violations'] = run_validation()

    os.makedirs('artifacts', exist_ok=True)
    with open('artifacts/jules-orchestration-report.json', 'w') as f:
        json.dump(report, f, indent=2)

if __name__ == '__main__':
    build_report()
