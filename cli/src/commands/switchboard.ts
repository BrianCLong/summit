/**
 * Switchboard Commands
 */

import { Command } from 'commander';
import * as crypto from 'crypto';
import { detectRepoRoot } from '../lib/sandbox.js';
import { runCapsule } from '../lib/switchboard-runner.js';
import { generateEvidenceBundle } from '../lib/switchboard-evidence.js';
import { replayCapsule } from '../lib/switchboard-replay.js';
import { loadCapsuleManifest } from '../lib/switchboard-capsule.js';
import * as companyos from '../lib/companyos-client.js';

export function registerSwitchboardCommands(program: Command): void {
  const switchboard = program
    .command('switchboard')
    .description('Switchboard capsule operations');

  switchboard
    .command('run')
    .description('Run a task capsule')
    .requiredOption('--capsule <path>', 'Path to capsule manifest')
    .option('--waiver <token>', 'Apply a waiver token if policy denies an action')
    .action(async (options: { capsule: string; waiver?: string }) => {
      try {
        const repoRoot = detectRepoRoot(process.cwd());
        const manifest = loadCapsuleManifest(options.capsule);
        const tenantId = (manifest as any).tenant_id || 'summit-internal';
        const actorId = process.env.USER || 'admin';
        const requestHash = crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');

        // Preflight / Simulation
        console.log('Running policy preflight...');
        const simulation = await companyos.simulatePolicy({
          tenantId,
          userId: actorId,
          userRole: process.env.SUMMIT_ROLE || 'FinanceAdmin',
          action: 'run_capsule',
          resource: manifest.name,
          context: { payment: (manifest as any).payment || {} }
        }).catch(e => {
          console.warn('Warning: Policy preflight unavailable, proceeding with caution.');
          return { decision: 'allow' as const, reasons: ['Preflight bypassed'], requiredApprovers: [], rationaleRequired: false };
        });

        console.log(\`Decision: \${simulation.decision}\`);

        if (simulation.decision === 'deny') {
          console.error(\`Execution denied: \${simulation.reasons.join(', ')}\`);

          await companyos.emitReceipt({
            tenantId,
            actionType: 'run_capsule_denied',
            actionId: crypto.randomUUID(),
            actorId,
            requestHash,
            policyBundleHash: 'v0.1.0',
            policyDecision: simulation,
            approvals: [],
            artifacts: [],
            result: 'DENIED',
            costTags: { tenant: tenantId }
          }).catch(() => {});

          process.exit(1);
        }

        if (simulation.decision === 'allow_with_approval') {
          console.log(\`Approval required. Reasons: \${simulation.reasons.join(', ')}\`);
          console.log(\`Required roles: \${simulation.requiredApprovers.join(', ')}\`);

          const approval = await companyos.createApprovalRequest({
            tenantId,
            requestId: crypto.randomUUID(),
            resourceType: 'capsule',
            actionType: 'run',
            requestedBy: actorId,
            requiredRoles: simulation.requiredApprovers,
            metadata: { manifest_name: manifest.name }
          });

          await companyos.emitReceipt({
            tenantId,
            actionType: 'run_capsule_pending',
            actionId: approval.id,
            actorId,
            requestHash,
            policyBundleHash: 'v0.1.0',
            policyDecision: simulation,
            approvals: [],
            artifacts: [],
            result: 'DENIED', // Still technically not executed
            errorCode: 'PENDING_APPROVAL',
            costTags: { tenant: tenantId }
          }).catch(() => {});

          console.log(\`Approval request created: \${approval.id}\`);
          console.log(\`Execute 'intelgraph switchboard approval decide \${approval.id} --status APPROVED --rationale "..."' to proceed.\`);
          return;
        }

        const result = await runCapsule({
          manifestPath: options.capsule,
          repoRoot,
          waiverToken: options.waiver,
        });

        // Emit receipt for successful execution
        await companyos.emitReceipt({
          tenantId,
          actionType: 'run_capsule',
          actionId: result.sessionId,
          actorId,
          requestHash,
          policyBundleHash: 'v0.1.0',
          policyDecision: simulation,
          approvals: [],
          artifacts: [{ type: 'ledger', uri: result.ledgerPath }],
          result: 'SUCCESS',
          costTags: { tenant: tenantId }
        }).catch(e => console.warn('Warning: Failed to emit receipt to ledger.'));

        console.log(\`Capsule session: \${result.sessionId}\`);
        console.log(\`Ledger: \${result.ledgerPath}\`);
        console.log(\`Diff: \${result.diffPath}\`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  switchboard
    .command('evidence <session_id>')
    .description('Generate an evidence bundle for a capsule session')
    .action((sessionId: string) => {
      try {
        const repoRoot = detectRepoRoot(process.cwd());
        const result = generateEvidenceBundle(repoRoot, sessionId);
        console.log(\`Evidence bundle: \${result.evidenceDir}\`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  switchboard
    .command('replay <session_id>')
    .description('Replay a capsule session and compare outputs')
    .action(async (sessionId: string) => {
      try {
        const repoRoot = detectRepoRoot(process.cwd());
        const report = await replayCapsule(repoRoot, sessionId);
        console.log(\`Replay session: \${report.replay_session}\`);
        console.log(\`Replay match: \${report.match ? 'yes' : 'no'}\`);
        if (!report.match) {
          console.log(\`Differences: \${report.differences.join('; ')}\`);
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  const approval = switchboard
    .command('approval')
    .description('Manage approval requests');

  approval
    .command('list')
    .description('List pending approval requests')
    .option('--tenant <id>', 'Filter by tenant ID')
    .action(async (options: { tenant?: string }) => {
      try {
        const approvals = await companyos.listApprovals(options.tenant);
        if (approvals.length === 0) {
          console.log('No approval requests found.');
          return;
        }
        console.table(approvals.map((a: any) => ({
          id: a.id,
          status: a.status,
          action: a.actionType,
          by: a.requestedBy,
          roles: a.requiredRoles.join(','),
          created: a.createdAt
        })));
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  approval
    .command('decide <id>')
    .description('Approve or deny a request')
    .requiredOption('--status <status>', 'APPROVED or DENIED')
    .requiredOption('--rationale <text>', 'Rationale for the decision')
    .action(async (id: string, options: { status: string; rationale: string }) => {
      try {
        const result = await companyos.decideApproval(id, options.status, process.env.USER || 'admin', options.rationale);
        console.log(\`Decision recorded. Status: \${result.status}\`);

        if (result.status === 'APPROVED') {
          console.log('You can now re-run the original command.');
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  const receipt = switchboard
    .command('receipt')
    .description('Provenance receipt operations');

  receipt
    .command('view <id>')
    .description('View a signed receipt')
    .action(async (id: string) => {
      try {
        const data = await companyos.getReceipt(id);
        console.log(JSON.stringify(data, null, 2));
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  switchboard
    .command('audit')
    .description('Search audit trail / receipts')
    .option('--tenant <id>', 'Filter by tenant ID')
    .option('--actor <id>', 'Filter by actor ID')
    .option('--type <type>', 'Filter by action type')
    .action(async (options: { tenant?: string; actor?: string; type?: string }) => {
      try {
        const results = await companyos.searchAudit(options);
        if (results.length === 0) {
          console.log('No receipts found.');
          return;
        }
        console.table(results.map((r: any) => ({
          id: r.id,
          tenant: r.tenantId,
          action: r.actionType,
          result: r.result,
          actor: r.actorId,
          time: r.occurredAt
        })));
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
