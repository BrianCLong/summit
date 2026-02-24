import { loadConfig } from './config.js';
import { runProbe } from './runner.js';
import { writeArtifacts } from './artifacts.js';
import { redactString } from './redaction.js';

const main = async () => {
  const config = loadConfig(process.argv.slice(2));
  const result = await runProbe(config);
  await writeArtifacts(config, result);
  process.exit(result.exitCode);
};

main().catch((error) => {
  console.error(redactString(error instanceof Error ? error.message : String(error)));
  process.exit(2);
});
