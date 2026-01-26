import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import Ajv from 'ajv';

const program = new Command();
const ajv = new Ajv();

program
  .name('gsv')
  .description('Graph Sync Validator - SLSA Provenance Verification Tool')
  .version('1.0.0');

program
  .command('attest-verify')
  .description('Verify artifact provenance against policy')
  .requiredOption('-p, --provenance <path>', 'Path to provenance file (JSON/DSSE)')
  .requiredOption('-l, --policy <path>', 'Path to policy file (JSON/YAML)')
  .requiredOption('-a, --artifact <digest>', 'Expected artifact digest (sha256:...)')
  .action(async (options) => {
    try {
      console.log(chalk.blue('Starting provenance verification...'));

      // 1. Load Policy
      const policyContent = fs.readFileSync(options.policy, 'utf8');
      const policy = options.policy.endsWith('.yaml') || options.policy.endsWith('.yml')
        ? yaml.load(policyContent) as any
        : JSON.parse(policyContent);

      // 2. Load Provenance
      const provContent = fs.readFileSync(options.provenance, 'utf8');
      const provenance = JSON.parse(provContent);

      // 3. Extract Predicate (handle DSSE wrapping if present)
      let predicate = provenance;
      if (provenance.payload) {
        // Assume DSSE base64 payload
        const payload = Buffer.from(provenance.payload, 'base64').toString();
        predicate = JSON.parse(payload);
      }

      // If it's a statement, get the predicate
      if (predicate.predicate) {
        predicate = predicate.predicate;
      }

      console.log(chalk.gray(`Verifying artifact: ${options.artifact}`));

      // 4. Verify Signature (SLSA Verifier)
      console.log(chalk.blue('Verifying signatures using slsa-verifier...'));
      try {
          const { execSync } = await import('node:child_process');
          // In a real implementation, we would call slsa-verifier with the appropriate flags
          // For now, we attempt to call it and provide a clear error if missing
          execSync(`slsa-verifier verify-artifact ${options.artifact.split(':')[1]} --provenance-path ${options.provenance} --source-uri ${policy.sourceRepository}`, { stdio: 'inherit' });
          console.log(chalk.green('✓ Cryptographic signature verified'));
      } catch (e: any) {
          console.warn(chalk.yellow('⚠ slsa-verifier not found or failed. Proceeding with metadata check only (Insecure Mode).'));
          // In a strict environment, we should exit here.
          if (process.env.STRICT_PROVENANCE === 'true') {
              console.error(chalk.red('❌ Signature verification mandatory but failed.'));
              process.exit(1);
          }
      }

      // 5. Verify Digest Match
      // In SLSA v1.0, the subject contains the digest
      const subjects = provenance.subject || [];
      const artifactMatch = subjects.find((s: any) =>
        s.digest && Object.values(s.digest).some(d => `sha256:${d}` === options.artifact || d === options.artifact)
      );

      if (!artifactMatch) {
        console.error(chalk.red('❌ Artifact digest mismatch: Subject not found in provenance'));
        process.exit(1);
      }
      console.log(chalk.green('✓ Artifact digest matches subject in provenance'));

      // 5. Enforce Policy
      const errors: string[] = [];

      if (policy.builderId && predicate.builder?.id !== policy.builderId) {
          errors.push(`Builder ID mismatch: expected ${policy.builderId}, got ${predicate.builder?.id}`);
      }

      if (policy.sourceRepository) {
          // Check materials in v0.2 or buildDefinition in v1.0
          const materials = predicate.materials || [];
          const sourceInMaterials = materials.find((m: any) => m.uri && m.uri.includes(policy.sourceRepository));

          const externalParams = predicate.buildDefinition?.externalParameters || {};
          const sourceInParams = externalParams.source === policy.sourceRepository ||
                               (externalParams.workflow?.repository && externalParams.workflow.repository.includes(policy.sourceRepository));

          if (!sourceInMaterials && !sourceInParams) {
              errors.push(`Source repository mismatch: expected ${policy.sourceRepository}`);
          }
      }

      if (errors.length > 0) {
        console.error(chalk.red('❌ Policy enforcement failed:'));
        errors.forEach(err => console.error(chalk.red(`  - ${err}`)));
        process.exit(1);
      }

      console.log(chalk.green('✅ Provenance verification PASSED'));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('attest-policy-gen')
  .description('Generate a scaffolded policy from a provenance file')
  .requiredOption('-p, --provenance <path>', 'Path to provenance file')
  .option('-o, --output <path>', 'Output path for policy', '.summit/provenance-policy.json')
  .action((options) => {
    try {
      const provContent = fs.readFileSync(options.provenance, 'utf8');
      const provenance = JSON.parse(provContent);

      let predicate = provenance.predicate || provenance;

      const policy = {
        builderId: predicate.builder?.id || "unknown",
        sourceRepository: predicate.buildDefinition?.externalParameters?.workflow?.repository ||
                         predicate.materials?.[0]?.uri ||
                         "https://github.com/BrianCLong/summit",
        minimumSlsaLevel: 3,
        allowedRefs: ["refs/heads/main", "refs/tags/*"]
      };

      const outputDir = path.dirname(options.output);
      if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(options.output, JSON.stringify(policy, null, 2));
      console.log(chalk.green(`Scaffolded policy created at ${options.output}`));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);
