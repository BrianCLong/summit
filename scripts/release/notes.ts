import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createCommand, logger, handleExit } from '../_lib/cli.js';
import { ArtifactManager } from '../_lib/artifacts.js';

async function generateNotes(options: any) {
  const { mode, outDir, json } = options;
  const artifactManager = new ArtifactManager(outDir);

  logger.section('Release Notes Generator');
  logger.info(`Mode: ${mode}`);

  if (mode === 'plan') {
      logger.info('Plan mode: Previewing release notes command...');
      logger.info('Command: scripts/gen-release-notes.sh');
      try {
          execSync('bash scripts/gen-release-notes.sh', { stdio: 'inherit' });
      } catch (e) {
          logger.error('Failed to generate preview.');
      }
      return;
  }

  // Apply
  const runDir = artifactManager.ensureDir('release');
  const outFile = path.join(runDir, `RELEASE_NOTES-${new Date().toISOString().replace(/[:.]/g, '-')}.md`);

  try {
      const notes = execSync('bash scripts/gen-release-notes.sh', { encoding: 'utf-8' });
      fs.writeFileSync(outFile, notes);
      logger.success(`Release notes generated at: ${outFile}`);

      if (json) {
          logger.json({ status: 'success', path: outFile });
      }
  } catch (e) {
      logger.error('Failed to generate release notes.');
      process.exit(1);
  }
}

const program = createCommand('release:notes', 'Generates standard release notes');

program.action(async (options) => {
    await generateNotes(options);
});

program.parse(process.argv);
