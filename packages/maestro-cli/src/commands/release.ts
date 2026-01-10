
import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  unlinkSync,
  readFileSync,
} from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';

// --- Dry-Run Types and Mappers ---

/** A structured reason for a NO-GO decision. */
type NoGoReason = { code: string; message: string; details?: any };

/**
 * A placeholder for the SDK's error class.
 * In a real scenario, this would be imported from '@intelgraph/release-bundle-sdk'
 */
class ReleaseBundleError extends Error {
  constructor(
    public code: string,
    public details?: any,
  ) {
    super(`ReleaseBundleError: ${code}`);
    this.name = 'ReleaseBundleError';
  }
}

/**
 * Maps an SDK error to a structured NO-GO reason.
 * @param e The error thrown by the release bundle SDK.
 * @returns A structured NoGoReason object.
 */
const mapError = (e: ReleaseBundleError): NoGoReason => {
  switch (e.code) {
    case 'INVALID_JSON':
      return {
        code: 'BUNDLE_INVALID_JSON',
        message: 'Release bundle contains invalid JSON.',
        details: e.details,
      };
    case 'MISSING_FIELD':
      return {
        code: 'BUNDLE_MISSING_FIELD',
        message: `Release bundle missing required field: ${
          e.details?.field ?? 'unknown'
        }`,
        details: e.details,
      };
    case 'INVALID_ENUM':
      return {
        code: 'BUNDLE_INVALID_VALUE',
        message: 'Release bundle contains an unsupported enum/value.',
        details: e.details,
      };
    case 'SCHEMA_INVALID':
      return {
        code: 'BUNDLE_SCHEMA_INVALID',
        message: 'Release bundle fails schema validation.',
        details: e.details,
      };
    case 'SCHEMA_MAJOR_UNSUPPORTED':
      return {
        code: 'BUNDLE_SCHEMA_INCOMPATIBLE',
        message:
          'Release bundle schema major is unsupported by this Maestro.',
        details: e.details,
      };
    default:
      // Re-throw unhandled SDK errors to be caught by the generic handler
      throw e;
  }
};

/**
 * Placeholder for the release bundle SDK's evaluation function.
 * This simulates the SDK's behavior for Maestro's dry-run command.
 * @param content The string content of the release bundle.
 * @returns A status object if parsing is successful.
 * @throws {ReleaseBundleError} If the bundle is invalid.
 */
const evaluateReleaseBundle = (
  content: string,
): { status: string; blockedReasons: any[] } => {
  try {
    const data = JSON.parse(content);
    if (!data.schemaVersion) {
      throw new ReleaseBundleError('MISSING_FIELD', { field: 'schemaVersion' });
    }
    if (data.schemaVersion.startsWith('0.')) {
      throw new ReleaseBundleError('SCHEMA_MAJOR_UNSUPPORTED', {
        version: data.schemaVersion,
      });
    }
    if (data.decision === 'NO-GO') {
      return {
        status: 'blocked',
        blockedReasons: data.reasons || [
          {
            code: 'UNKNOWN_REASON',
            message: 'The bundle decision was NO-GO',
          },
        ],
      };
    }
    // Add other checks from the prompt spec
    if (data.status && data.status === 'invalid') {
      throw new ReleaseBundleError('INVALID_ENUM', {
        field: 'status',
        value: data.status,
      });
    }

    return { status: 'valid', blockedReasons: [] };
  } catch (e: any) {
    if (e instanceof SyntaxError) {
      throw new ReleaseBundleError('INVALID_JSON', { error: e.message });
    }
    throw e; // rethrow other errors
  }
};

interface EvidenceOptions {
  tag: string;
  sha?: string;
  runUrl?: string;
  runId?: string;
  expiresHours: number;
}

export class ReleaseCommand {
  public async createEvidence(options: EvidenceOptions) {
    const { tag, sha: inputSha, runUrl, runId, expiresHours } = options;
    const sha = inputSha || this.getShaForTag(tag);

    // 1. Construct evidence JSON
    const evidence = this.constructEvidenceJson(
      tag,
      sha,
      runUrl,
      runId,
      expiresHours,
    );

    // 2. Write file
    const evidencePath = this.writeEvidenceFile(tag, evidence);

    // 3. Create branch, commit, and open PR
    this.createPullRequest(
      tag,
      evidencePath,
      sha,
      runUrl,
      evidence.expiresAt,
    );
  }

  /**
   * Performs a dry-run evaluation of a release bundle.
   */
  public async dryRun(options: { bundle: string; verbose: boolean }) {
    const { bundle: bundlePath, verbose } = options;
    const result: {
      decision: string;
      reasons: NoGoReason[];
      errors?: any[];
    } = {
      decision: 'GO',
      reasons: [],
    };
    let exitCode = 0;

    try {
      if (!existsSync(bundlePath)) {
        // Use a specific error for file not found
        throw new ReleaseBundleError('BUNDLE_NOT_FOUND', { path: bundlePath });
      }
      const bundleContent = readFileSync(bundlePath, 'utf-8');
      const evaluation = evaluateReleaseBundle(bundleContent);

      if (evaluation.status === 'blocked') {
        result.decision = 'NO-GO';
        // This is the passthrough logic
        result.reasons.push(...evaluation.blockedReasons);
        exitCode = 2;
      }
    } catch (e) {
      if (e instanceof ReleaseBundleError) {
        try {
          const reason = mapError(e);
          result.decision = 'NO-GO';
          result.reasons.push(reason);
        } catch (unmappedError) {
          // mapError re-threw an unhandled SDK error
          const err = unmappedError as Error;
          result.decision = 'ERROR';
          result.reasons.push({
            code: 'UNMAPPED_SDK_ERROR',
            message: err.message,
            details: (err as any).details,
          });
        }
        exitCode = 2; // NO-GO exit code for both mapped and unmapped SDK errors
      } else {
        // Unexpected error (not a ReleaseBundleError)
        result.decision = 'ERROR';
        const err = e as Error;
        result.reasons.push({
          code: 'UNEXPECTED_ERROR',
          message: err.message,
        });
        result.errors = [verbose ? err.stack : err.message];
        exitCode = 1; // Unexpected error exit code
      }
    }

    // --- Console Output ---
    if (result.decision === 'GO') {
      console.log(chalk.green.bold('✅ GO'));
      console.log(chalk.green('   Release bundle is valid and compatible.'));
    } else if (result.decision === 'NO-GO') {
      console.log(chalk.red.bold('❌ NO-GO'));
      result.reasons.forEach(r => {
        const summary = this.getSummaryForReason(r.code);
        console.log(
          chalk.red(`   - ${chalk.bold(r.code)}: ${r.message}`) +
            (summary ? chalk.gray(`\n     Hint: ${summary}`) : ''),
        );
      });
    } else {
      // ERROR case
      console.log(chalk.magenta.bold('💥 ERROR'));
      result.reasons.forEach(r => {
        console.log(chalk.magenta(`   - ${chalk.bold(r.code)}: ${r.message}`));
      });
      if (!verbose) {
        console.log(chalk.gray('\nUse --verbose for full stack trace.'));
      }
    }

    // --- Machine-readable output ---
    const resultFilePath = resolve(
      process.cwd(),
      'maestro-release-dryrun-result.json',
    );
    writeFileSync(resultFilePath, JSON.stringify(result, null, 2));
    console.log(chalk.gray(`\nResult written to ${resultFilePath}`));

    if (process.env.NODE_ENV !== 'test') {
      process.exit(exitCode);
    }
  }

  private getSummaryForReason(code: string): string | null {
    const summaries: Record<string, string> = {
      BUNDLE_SCHEMA_INCOMPATIBLE: 'update release-bundle SDK / Maestro',
      BUNDLE_INVALID_JSON: 'check bundle file for syntax errors',
      BUNDLE_MISSING_FIELD: 'ensure all required fields are in the bundle',
      BUNDLE_INVALID_VALUE: 'check bundle values against the schema',
      BUNDLE_SCHEMA_INVALID: 'validate the bundle against the schema',
    };
    return summaries[code] || null;
  }

  private getShaForTag(tag: string): string {
    try {
      return execSync(`git rev-list -n 1 ${tag}`).toString().trim();
    } catch (error) {
      console.error(chalk.red(`Error resolving SHA for tag "${tag}"`));
      throw error;
    }
  }

  private constructEvidenceJson(
    tag: string,
    sha: string,
    runUrl: string | undefined,
    runId: string | undefined,
    expiresHours: number,
  ) {
    const generatedAt = new Date();
    const expiresAt = new Date(
      generatedAt.getTime() + expiresHours * 60 * 60 * 1000,
    );

    return {
      schemaVersion: '1.0.0',
      tag,
      sha,
      decision: 'GO',
      reasons: [],
      run: { url: runUrl || '', id: runId ? parseInt(runId, 10) : 0 },
      generatedAt: generatedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  private writeEvidenceFile(tag: string, evidence: object): string {
    const dir = resolve(process.cwd(), 'release-evidence');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const evidencePath = resolve(dir, `${tag}.json`);
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
    return evidencePath;
  }

  private createPullRequest(
    tag: string,
    evidencePath: string,
    sha: string,
    runUrl: string | undefined,
    expiresAt: string,
  ) {
    const branchName = `chore/release-evidence-${tag.replace(/[./]/g, '-')}`;
    const commitMessage = `chore(release): evidence for ${tag}`;
    const prBody = `
      ## Release Evidence for ${tag}
      - **Tag:** ${tag}
      - **SHA:** ${sha}
      - **Dry-run URL:** ${runUrl || 'N/A'}
      - **Expires At:** ${expiresAt}

      Merging this PR enables publishing the tag release.
    `;
    const prBodyFile = resolve(tmpdir(), `pr-body-${Date.now()}.md`);
    writeFileSync(prBodyFile, prBody);
    try {
      execSync(`git checkout -b ${branchName}`);
      execSync(`git add ${evidencePath}`);
      execSync(`git commit -m "${commitMessage}"`);
      execSync(
        `gh pr create --title "${commitMessage}" --body-file "${prBodyFile}"`,
      );
    } catch (error) {
      console.error(chalk.red('Error creating pull request'));
      // attempt to clean up the branch
      execSync(`git checkout -`);
      execSync(`git branch -D ${branchName}`);
      throw error;
    } finally {
        if(existsSync(prBodyFile)) {
            unlinkSync(prBodyFile);
        }
    }
  }
}

export function registerReleaseCommands(program: Command) {
    const releaseCommand = new Command('release').description(
        'Release-related commands',
    );

    releaseCommand
        .command('evidence')
        .description('Generate release evidence and open a PR')
        .requiredOption('--tag <tag>', 'The release tag (e.g., vX.Y.Z)')
        .option('--sha <commitSha>', 'Optional commit SHA')
        .option('--run-url <url>', 'Optional URL of the dry-run')
        .option('--run-id <id>', 'Optional ID of the dry-run')
        .option(
        '--expires-hours <hours>',
        'Optional expiration in hours',
        '24',
        )
        .action(async (options) => {
        const { tag, sha, runUrl, runId, expiresHours } = options;
        const release = new ReleaseCommand();
        await release.createEvidence({
            tag,
            sha,
            runUrl,
            runId,
            expiresHours: parseInt(expiresHours, 10),
        });
        });

    releaseCommand
        .command('dry-run')
        .description('Evaluate a release bundle for GO/NO-GO decision')
        .requiredOption(
            '--bundle <path>',
            'Path to the release bundle JSON file',
        )
        .option('--verbose', 'Enable verbose logging for unexpected errors')
        .action(async (options) => {
            const release = new ReleaseCommand();
            await release.dryRun(options);
        });

    program.addCommand(releaseCommand);
}
