
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';
import { execSync } from 'child_process';

// --- Schemas ---

const PolicySchema = z.object({
  channels: z.record(z.string(), z.object({
    allowed_branches: z.array(z.string()).optional(),
    requirements: z.object({
      evidence: z.array(z.string()),
      shards: z.array(z.string()),
      resilience: z.object({
        dr_drill: z.enum(['required', 'optional', 'none']).default('none'),
        backup_integrity: z.enum(['required', 'optional', 'none']).default('none'),
      }).optional(),
    }).optional(),
  })),
});

const ManifestSchema = z.object({
  commit_sha: z.string(),
  tag: z.string().optional(),
  workflow_run_id: z.string().optional(),
  artifacts: z.record(z.string(), z.string()), // filename -> checksum (sha256:...)
  created_at: z.string(),
});

// --- Helpers ---

function log(message: string) {
  console.error(`[INFO] ${message}`);
}

function error(message: string) {
  console.error(`[ERROR] ${message}`);
}

function findArtifact(artifacts: Record<string, string>, searchString: string): string | undefined {
  // Try exact match first
  if (artifacts[searchString]) return searchString;

  // Search for key containing searchString
  const foundKey = Object.keys(artifacts).find(k => k.includes(searchString));
  if (foundKey) return foundKey;

  // Search for file extension matches if provided string looks like a base name
  // This part is fuzzy, but we rely on conventions.
  return undefined;
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const options = {
    tag: '',
    channel: '',
    evidenceDir: 'dist/evidence',
    offline: false,
    ciFetch: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--tag') options.tag = args[++i];
    else if (arg === '--channel') options.channel = args[++i];
    else if (arg === '--evidence-dir') options.evidenceDir = args[++i];
    else if (arg === '--offline') options.offline = true;
    else if (arg === '--ci-fetch') options.ciFetch = true;
  }

  if (!options.channel) {
    console.log(JSON.stringify({ decision: 'DENY', reasons: [{ code: 'MISSING_ARG', message: '--channel is required' }] }, null, 2));
    process.exit(1);
  }

  const reasons: any[] = [];
  let policy: any = null;
  let manifest: any = null;

  // A) Validate Policy
  try {
    const policyPath = path.resolve(process.cwd(), 'release-policy.yml');
    if (!fs.existsSync(policyPath)) {
        reasons.push({ code: 'POLICY_MISSING', message: 'release-policy.yml not found' });
        // Cannot proceed without policy
        console.log(JSON.stringify({ decision: 'DENY', reasons, evidence: null, policy: null }, null, 2));
        process.exit(1);
    }
    const policyContent = fs.readFileSync(policyPath, 'utf8');
    const policyRaw = yaml.load(policyContent);
    policy = PolicySchema.parse(policyRaw);
  } catch (e) {
    reasons.push({ code: 'POLICY_INVALID', message: (e as Error).message });
    console.log(JSON.stringify({ decision: 'DENY', reasons, evidence: null, policy: null }, null, 2));
    process.exit(1);
  }

  const channelPolicy = policy.channels[options.channel];
  if (!channelPolicy) {
    reasons.push({ code: 'CHANNEL_INVALID', message: `Channel '${options.channel}' not defined in policy` });
    console.log(JSON.stringify({ decision: 'DENY', reasons, evidence: null, policy }, null, 2));
    process.exit(1);
  }

  // B) Verify Evidence Pack Integrity
  try {
    const verifyScript = path.resolve(process.cwd(), 'scripts/verification/verify_evidence_pack.ts');
    const verifyCmd = `npx tsx ${verifyScript} --evidence-dir ${options.evidenceDir}`;

    // execSync throws if exit code != 0.
    // We want to capture stderr too.
    try {
        const output = execSync(verifyCmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        const verifyResult = JSON.parse(output);
        if (verifyResult.status !== 'success') {
          reasons.push({ code: 'EVIDENCE_Integrity', message: 'Evidence pack verification failed', details: verifyResult.errors });
        } else {
          manifest = verifyResult.manifest;
        }
    } catch (e: any) {
        // e.stdout and e.stderr contain the output
        if (e.stdout) {
             try {
                const verifyResult = JSON.parse(e.stdout.toString());
                 if (verifyResult.status !== 'success') {
                    reasons.push({ code: 'EVIDENCE_Integrity', message: 'Evidence pack verification failed', details: verifyResult.errors });
                 }
             } catch (parseError) {
                 reasons.push({ code: 'EVIDENCE_VERIFICATION_ERROR', message: `Verification script failed with non-JSON output. Stderr: ${e.stderr?.toString()}` });
             }
        } else {
             reasons.push({ code: 'EVIDENCE_VERIFICATION_ERROR', message: `Verification script failed: ${e.message}. Stderr: ${e.stderr?.toString()}` });
        }
    }

  } catch (e) {
    reasons.push({ code: 'EVIDENCE_VERIFICATION_ERROR', message: `Failed to run verification: ${(e as Error).message}` });
  }

  if (!manifest) {
    // If we can't trust the manifest, we stop
    console.log(JSON.stringify({ decision: 'DENY', reasons, evidence: null, policy }, null, 2));
    process.exit(1);
  }

  // C) Verify Attestations/Provenance
  const requirements = channelPolicy.requirements || { evidence: [], shards: [] };

  if (requirements.evidence.includes('attestations')) {
    if (!findArtifact(manifest.artifacts, 'attestations') && !findArtifact(manifest.artifacts, 'provenance')) {
         reasons.push({ code: 'MISSING_ATTESTATIONS', message: 'Attestations artifact missing from manifest' });
    }
  }

  // D) Verify Resilience Evidence
  if (requirements.resilience?.dr_drill === 'required') {
      if (!findArtifact(manifest.artifacts, 'dr-drill-report') && !findArtifact(manifest.artifacts, 'resilience-report')) {
          reasons.push({ code: 'MISSING_DR_EVIDENCE', message: 'DR drill evidence is required for this channel' });
      }
  }
  if (requirements.resilience?.backup_integrity === 'required') {
      if (!findArtifact(manifest.artifacts, 'backup-integrity-report') && !findArtifact(manifest.artifacts, 'resilience-report')) {
           reasons.push({ code: 'MISSING_BACKUP_EVIDENCE', message: 'Backup integrity evidence is required for this channel' });
      }
  }

  // E) Verify CI Truth (ga:verify shards)
  // Check for ga-verify-summary
  const summaryFilename = findArtifact(manifest.artifacts, 'ga-verify-summary') || findArtifact(manifest.artifacts, 'shard-summary');

  if (summaryFilename) {
      try {
         const summaryContent = fs.readFileSync(path.join(options.evidenceDir, summaryFilename), 'utf8');
         const summary = JSON.parse(summaryContent);
         // Check required shards
         if (requirements.shards) {
             for (const shard of requirements.shards) {
                 if (!summary[shard] || summary[shard].status !== 'success') {
                     reasons.push({ code: 'SHARD_FAILURE', message: `Required shard '${shard}' is missing or failed`, details: summary[shard] });
                 }
             }
         }
      } catch (e) {
          reasons.push({ code: 'SHARD_SUMMARY_ERROR', message: 'Failed to read/parse shard summary' });
      }
  } else {
       // If shards are required and we don't have summary
       if (requirements.shards && requirements.shards.length > 0) {
           if (!options.offline && options.ciFetch) {
               // Try to fetch via GitHub CLI if available
               try {
                   log('Attempting to fetch CI status via GitHub CLI...');
                   // This assumes we are in a repo context or have config
                   // fetch generic status for the commit
                   // gh run list --commit <sha> --json name,conclusion
                   const commitSha = manifest.commit_sha;
                   if (!commitSha) throw new Error('No commit SHA in manifest');

                   const fetchCmd = `gh run list --commit ${commitSha} --json name,conclusion,status`;
                   const ciOutput = execSync(fetchCmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
                   const runs = JSON.parse(ciOutput);

                   // Map runs to shards. This logic is heuristic since we don't have a strict mapping in policy
                   // Policy says "build", "test". We look for workflows/jobs with those names.

                   const shardStatus: Record<string, string> = {};
                   for (const run of runs) {
                       // Normalize name
                       const name = run.name.toLowerCase();
                       if (run.conclusion === 'success') {
                           if (name.includes('build')) shardStatus['build'] = 'success';
                           if (name.includes('test')) shardStatus['test'] = 'success';
                           if (name.includes('security')) shardStatus['security-scan'] = 'success';
                           if (name.includes('e2e')) shardStatus['e2e'] = 'success';
                       }
                   }

                   for (const shard of requirements.shards) {
                       if (shardStatus[shard] !== 'success') {
                            reasons.push({ code: 'SHARD_FAILURE_REMOTE', message: `Remote CI shard '${shard}' not found or not success` });
                       }
                   }

               } catch (e: any) {
                   log(`CI Fetch failed: ${e.message}`);
                   reasons.push({ code: 'CI_FETCH_ERROR', message: 'Failed to fetch CI status from remote', details: e.message });
               }

           } else {
               const msg = options.offline ? 'offline mode is active' : 'CI fetch not enabled';
               reasons.push({ code: 'MISSING_SHARD_EVIDENCE', message: `No shard summary in evidence pack and ${msg}` });
           }
       }
  }

  // F) Enforce Channel Rules (Branch)
  const currentBranch = process.env.GITHUB_REF_NAME || process.env.CI_COMMIT_REF_NAME;
  if (currentBranch && channelPolicy.allowed_branches) {
      const allowed = channelPolicy.allowed_branches.some((pattern: string) => {
          if (pattern.endsWith('*')) {
              return currentBranch.startsWith(pattern.slice(0, -1));
          }
          return currentBranch === pattern;
      });
      if (!allowed) {
          reasons.push({ code: 'BRANCH_POLICY_VIOLATION', message: `Branch '${currentBranch}' not allowed for channel '${options.channel}'` });
      }
  }

  const decision = reasons.length === 0 ? 'ALLOW' : 'DENY';

  const output = {
    decision,
    reasons,
    evidence: manifest,
    policy: { version: 'v2', channel: options.channel }
  };

  console.log(JSON.stringify(output, null, 2));

  if (decision === 'DENY') {
      process.exit(1);
  }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
