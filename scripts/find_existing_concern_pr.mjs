import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

function main() {
  const concern = process.env.PR_CONCERN;
  if (!concern || concern === 'unknown') {
    console.log('No known concern provided.');
    return;
  }

  try {
    const concernsPath = path.resolve(process.cwd(), 'governance/concerns.yml');
    const concernsContent = fs.readFileSync(concernsPath, 'utf8');
    const concerns = yaml.load(concernsContent);

    const concernData = concerns[concern];
    if (!concernData) {
      console.log(`Concern ${concern} not found in registry.`);
      return;
    }

    const canonicalBranch = concernData.canonical_branch;

    try {
        const branchExists = execSync(`git ls-remote --heads origin ${canonicalBranch}`).toString().trim().length > 0;
        if (branchExists) {
            console.log(`Found existing canonical branch: ${canonicalBranch}`);
            if (process.env.GITHUB_OUTPUT) {
                fs.appendFileSync(process.env.GITHUB_OUTPUT, `canonical_branch=${canonicalBranch}\n`);
                fs.appendFileSync(process.env.GITHUB_OUTPUT, `has_existing_pr=true\n`);
            }
        } else {
             console.log(`Canonical branch ${canonicalBranch} does not exist yet.`);
             if (process.env.GITHUB_OUTPUT) {
                fs.appendFileSync(process.env.GITHUB_OUTPUT, `has_existing_pr=false\n`);
            }
        }
    } catch (e) {
         console.log('Error checking git branches', e.message);
    }
  } catch (e) {
    console.error('Error in find_existing_concern_pr:', e);
    process.exitCode = 1;
  }
}

main();
