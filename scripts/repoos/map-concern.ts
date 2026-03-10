import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface ConcernRegistry {
  concerns: {
    [concernId: string]: {
      owners: string[];
      paths: string[];
    };
  };
}

function mapConcern(changedFiles: string[]): string {
  const registryPath = path.join(process.cwd(), 'repoos', 'concerns', 'concern-registry.yaml');

  if (!fs.existsSync(registryPath)) {
    console.error(`Registry file not found at ${registryPath}`);
    process.exit(1);
  }

  const fileContents = fs.readFileSync(registryPath, 'utf8');
  const registry = yaml.load(fileContents) as ConcernRegistry;

  // Default to unknown if no match
  let assignedConcern = 'unknown';

  for (const file of changedFiles) {
    for (const [concernId, concernData] of Object.entries(registry.concerns)) {
      for (const prefix of concernData.paths) {
        if (file.startsWith(prefix)) {
          assignedConcern = concernId;
          break;
        }
      }
      if (assignedConcern !== 'unknown') break;
    }
    if (assignedConcern !== 'unknown') break;
  }

  if (assignedConcern === 'unknown') {
     console.error("No PR may exist without a concern assignment.");
     process.exit(1);
  }

  return assignedConcern;
}

function main() {
  const changedFiles = process.argv.slice(2);

  const concernId = mapConcern(changedFiles);

  console.log(concernId);

  const outputData = { concern: concernId };
  fs.writeFileSync('concern-classification.json', JSON.stringify(outputData, null, 2));
}

main();
