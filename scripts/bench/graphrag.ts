import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { runGraphRagBench } from '../../server/src/bench/graphrag/run.js';

const args = process.argv.slice(2);

const usage = () => {
  console.log('Usage: pnpm summit:bench graphrag --profile=mws');
};

if (args.length === 0 || args[0] !== 'graphrag') {
  usage();
  process.exit(1);
}

const profileArg = args.find((arg) => arg.startsWith('--profile='));
const profileName = profileArg ? profileArg.split('=')[1] : 'mws';

const profilePath = path.join(
  process.cwd(),
  'server',
  'src',
  'bench',
  'graphrag',
  'profiles',
  `${profileName}.json`,
);

if (!fs.existsSync(profilePath)) {
  console.error(`Profile not found: ${profilePath}`);
  process.exit(1);
}

const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));

const gitSha = process.env.GIT_SHA
  ? process.env.GIT_SHA
  : execSync('git rev-parse HEAD').toString().trim();

const outputDir = path.join(
  process.cwd(),
  'artifacts',
  'bench',
  'graphrag',
  profileName,
);

runGraphRagBench(profile, outputDir, gitSha)
  .then(() => {
    console.log(`GraphRAG benchmark complete: ${outputDir}`);
  })
  .catch((error) => {
    console.error(`GraphRAG benchmark failed: ${error.message}`);
    process.exit(1);
  });
