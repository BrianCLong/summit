import fs from 'fs';
import path from 'path';

interface DeployStamp {
  environment: string;
  sha: string;
  timestamp: string;
  deployer?: string;
}

const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--env='));
const shaArg = args.find(arg => arg.startsWith('--sha='));
const outArg = args.find(arg => arg.startsWith('--out='));

if (!envArg || !shaArg) {
  console.error('Usage: ts-node generate-deploy-stamp.ts --env=<env> --sha=<sha> [--out=<path>]');
  process.exit(1);
}

const env = envArg.split('=')[1];
const sha = shaArg.split('=')[1];
const outPath = outArg ? outArg.split('=')[1] : `deploy-stamp-${env}.json`;

const stamp: DeployStamp = {
  environment: env,
  sha: sha,
  timestamp: new Date().toISOString(),
  deployer: process.env.USER || 'ci-bot',
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(stamp, null, 2));

console.log(`Generated deploy stamp for ${env} at ${outPath}`);
