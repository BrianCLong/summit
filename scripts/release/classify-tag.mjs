import fs from 'fs';
import path from 'path';

const tag = process.env.TAG || process.argv[2];

if (!tag) {
  console.error('Error: TAG is required as an environment variable or argument.');
  process.exit(1);
}

// Regex to match vX.Y.Z-rc.N or vX.Y.Z
const rcRegex = /^v(\d+\.\d+\.\d+)-rc\.(\d+)$/;
const gaRegex = /^v(\d+\.\d+\.\d+)$/;

let result;

if (rcRegex.test(tag)) {
  const match = tag.match(rcRegex);
  result = {
    tag: tag,
    channel: 'rc',
    version: match[1],
    rc: parseInt(match[2], 10)
  };
} else if (gaRegex.test(tag)) {
  const match = tag.match(gaRegex);
  result = {
    tag: tag,
    channel: 'ga',
    version: match[1]
  };
} else {
  console.error(`Error: Invalid tag format '${tag}'. Expected vX.Y.Z or vX.Y.Z-rc.N`);
  process.exit(1);
}

const distDir = path.resolve('dist/release');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const outputPath = path.join(distDir, 'channel.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

console.log(`Classified tag ${tag} as ${result.channel}`);
