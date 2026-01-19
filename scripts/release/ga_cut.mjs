#!/usr/bin/env node
import { execSync } from 'child_process';

const dry = process.argv.includes('--dry-run');

const run = (cmd)=> console.log(cmd) || (dry ? null : execSync(cmd, { stdio:'inherit' }));

run('node scripts/ci/verify_evidence_id_consistency.mjs --map ./.ga/evidence/evidence-map.json');
run('git diff --exit-code');
run('git tag -a ga-$(date +%Y%m%d) -m "GA cut"');
run('git push --tags');
