
import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';

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

    program.addCommand(releaseCommand);
}
