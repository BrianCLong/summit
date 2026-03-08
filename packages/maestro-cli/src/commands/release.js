"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReleaseCommand = void 0;
exports.registerReleaseCommands = registerReleaseCommands;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
/**
 * A placeholder for the SDK's error class.
 * In a real scenario, this would be imported from '@intelgraph/release-bundle-sdk'
 */
class ReleaseBundleError extends Error {
    code;
    details;
    constructor(code, details) {
        super(`ReleaseBundleError: ${code}`);
        this.code = code;
        this.details = details;
        this.name = 'ReleaseBundleError';
    }
}
/**
 * Maps an SDK error to a structured NO-GO reason.
 * @param e The error thrown by the release bundle SDK.
 * @returns A structured NoGoReason object.
 */
const mapError = (e) => {
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
                message: `Release bundle missing required field: ${e.details?.field ?? 'unknown'}`,
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
                message: 'Release bundle schema major is unsupported by this Maestro.',
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
const evaluateReleaseBundle = (content) => {
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
    }
    catch (e) {
        if (e instanceof SyntaxError) {
            throw new ReleaseBundleError('INVALID_JSON', { error: e.message });
        }
        throw e; // rethrow other errors
    }
};
class ReleaseCommand {
    async createEvidence(options) {
        const { tag, sha: inputSha, runUrl, runId, expiresHours } = options;
        const sha = inputSha || this.getShaForTag(tag);
        // 1. Construct evidence JSON
        const evidence = this.constructEvidenceJson(tag, sha, runUrl, runId, expiresHours);
        // 2. Write file
        const evidencePath = this.writeEvidenceFile(tag, evidence);
        // 3. Create branch, commit, and open PR
        this.createPullRequest(tag, evidencePath, sha, runUrl, evidence.expiresAt);
    }
    /**
     * Performs a dry-run evaluation of a release bundle.
     */
    async dryRun(options) {
        const { bundle: bundlePath, verbose } = options;
        const result = {
            decision: 'GO',
            reasons: [],
        };
        let exitCode = 0;
        try {
            if (!(0, fs_1.existsSync)(bundlePath)) {
                // Use a specific error for file not found
                throw new ReleaseBundleError('BUNDLE_NOT_FOUND', { path: bundlePath });
            }
            const bundleContent = (0, fs_1.readFileSync)(bundlePath, 'utf-8');
            const evaluation = evaluateReleaseBundle(bundleContent);
            if (evaluation.status === 'blocked') {
                result.decision = 'NO-GO';
                // This is the passthrough logic
                result.reasons.push(...evaluation.blockedReasons);
                exitCode = 2;
            }
        }
        catch (e) {
            if (e instanceof ReleaseBundleError) {
                try {
                    const reason = mapError(e);
                    result.decision = 'NO-GO';
                    result.reasons.push(reason);
                }
                catch (unmappedError) {
                    // mapError re-threw an unhandled SDK error
                    const err = unmappedError;
                    result.decision = 'ERROR';
                    result.reasons.push({
                        code: 'UNMAPPED_SDK_ERROR',
                        message: err.message,
                        details: err.details,
                    });
                }
                exitCode = 2; // NO-GO exit code for both mapped and unmapped SDK errors
            }
            else {
                // Unexpected error (not a ReleaseBundleError)
                result.decision = 'ERROR';
                const err = e;
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
            console.log(chalk_1.default.green.bold('✅ GO'));
            console.log(chalk_1.default.green('   Release bundle is valid and compatible.'));
        }
        else if (result.decision === 'NO-GO') {
            console.log(chalk_1.default.red.bold('❌ NO-GO'));
            result.reasons.forEach(r => {
                const summary = this.getSummaryForReason(r.code);
                console.log(chalk_1.default.red(`   - ${chalk_1.default.bold(r.code)}: ${r.message}`) +
                    (summary ? chalk_1.default.gray(`\n     Hint: ${summary}`) : ''));
            });
        }
        else {
            // ERROR case
            console.log(chalk_1.default.magenta.bold('💥 ERROR'));
            result.reasons.forEach(r => {
                console.log(chalk_1.default.magenta(`   - ${chalk_1.default.bold(r.code)}: ${r.message}`));
            });
            if (!verbose) {
                console.log(chalk_1.default.gray('\nUse --verbose for full stack trace.'));
            }
        }
        // --- Machine-readable output ---
        const resultFilePath = (0, path_1.resolve)(process.cwd(), 'maestro-release-dryrun-result.json');
        (0, fs_1.writeFileSync)(resultFilePath, JSON.stringify(result, null, 2));
        console.log(chalk_1.default.gray(`\nResult written to ${resultFilePath}`));
        if (process.env.NODE_ENV !== 'test') {
            process.exit(exitCode);
        }
    }
    getSummaryForReason(code) {
        const summaries = {
            BUNDLE_SCHEMA_INCOMPATIBLE: 'update release-bundle SDK / Maestro',
            BUNDLE_INVALID_JSON: 'check bundle file for syntax errors',
            BUNDLE_MISSING_FIELD: 'ensure all required fields are in the bundle',
            BUNDLE_INVALID_VALUE: 'check bundle values against the schema',
            BUNDLE_SCHEMA_INVALID: 'validate the bundle against the schema',
        };
        return summaries[code] || null;
    }
    getShaForTag(tag) {
        try {
            return (0, child_process_1.execSync)(`git rev-list -n 1 ${tag}`).toString().trim();
        }
        catch (error) {
            console.error(chalk_1.default.red(`Error resolving SHA for tag "${tag}"`));
            throw error;
        }
    }
    constructEvidenceJson(tag, sha, runUrl, runId, expiresHours) {
        const generatedAt = new Date();
        const expiresAt = new Date(generatedAt.getTime() + expiresHours * 60 * 60 * 1000);
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
    writeEvidenceFile(tag, evidence) {
        const dir = (0, path_1.resolve)(process.cwd(), 'release-evidence');
        if (!(0, fs_1.existsSync)(dir)) {
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        }
        const evidencePath = (0, path_1.resolve)(dir, `${tag}.json`);
        (0, fs_1.writeFileSync)(evidencePath, JSON.stringify(evidence, null, 2));
        return evidencePath;
    }
    createPullRequest(tag, evidencePath, sha, runUrl, expiresAt) {
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
        const prBodyFile = (0, path_1.resolve)((0, os_1.tmpdir)(), `pr-body-${Date.now()}.md`);
        (0, fs_1.writeFileSync)(prBodyFile, prBody);
        try {
            (0, child_process_1.execSync)(`git checkout -b ${branchName}`);
            (0, child_process_1.execSync)(`git add ${evidencePath}`);
            (0, child_process_1.execSync)(`git commit -m "${commitMessage}"`);
            (0, child_process_1.execSync)(`gh pr create --title "${commitMessage}" --body-file "${prBodyFile}"`);
        }
        catch (error) {
            console.error(chalk_1.default.red('Error creating pull request'));
            // attempt to clean up the branch
            (0, child_process_1.execSync)(`git checkout -`);
            (0, child_process_1.execSync)(`git branch -D ${branchName}`);
            throw error;
        }
        finally {
            if ((0, fs_1.existsSync)(prBodyFile)) {
                (0, fs_1.unlinkSync)(prBodyFile);
            }
        }
    }
}
exports.ReleaseCommand = ReleaseCommand;
function registerReleaseCommands(program) {
    const releaseCommand = new commander_1.Command('release').description('Release-related commands');
    releaseCommand
        .command('evidence')
        .description('Generate release evidence and open a PR')
        .requiredOption('--tag <tag>', 'The release tag (e.g., vX.Y.Z)')
        .option('--sha <commitSha>', 'Optional commit SHA')
        .option('--run-url <url>', 'Optional URL of the dry-run')
        .option('--run-id <id>', 'Optional ID of the dry-run')
        .option('--expires-hours <hours>', 'Optional expiration in hours', '24')
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
        .requiredOption('--bundle <path>', 'Path to the release bundle JSON file')
        .option('--verbose', 'Enable verbose logging for unexpected errors')
        .action(async (options) => {
        const release = new ReleaseCommand();
        await release.dryRun(options);
    });
    program.addCommand(releaseCommand);
}
