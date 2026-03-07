import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import yaml from 'js-yaml';

function getChangedFiles() {
  try {
    const output = execSync('git diff --name-only origin/main...HEAD').toString();
    return output.split('\n').filter(Boolean);
  } catch (e) {
    console.error('Failed to get changed files', e);
    return [];
  }
}

function classifyConcern(files, title, body, concernsMap) {
  const text = `${title} ${body} ${files.join(' ')}`.toLowerCase();

  for (const [concernName, data] of Object.entries(concernsMap)) {
    if (text.includes(concernName) || (data.keywords && data.keywords.some(k => text.includes(k)))) {
      return concernName;
    }
    if (concernName === 'ci-gate' && (text.includes('ci') || text.includes('workflow') || text.includes('github'))) {
      return concernName;
    }
    if (concernName === 'artifact-evidence' && (text.includes('artifact') || text.includes('evidence'))) {
      return concernName;
    }
  }

  return 'unknown';
}

function main() {
  try {
    const concernsPath = path.resolve(process.cwd(), 'governance/concerns.yml');
    const concernsContent = fs.readFileSync(concernsPath, 'utf8');
    const concerns = yaml.load(concernsContent);

    const changedFiles = getChangedFiles();
    const title = process.env.PR_TITLE || '';
    const body = process.env.PR_BODY || '';

    const concern = classifyConcern(changedFiles, title, body, concerns);
    console.log(`Classified concern: ${concern}`);

    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `concern=${concern}\n`);
    }
  } catch (e) {
    console.error('Error in classify_concern:', e);
    process.exitCode = 1;
  }
}

main();
