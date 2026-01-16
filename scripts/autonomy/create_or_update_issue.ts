import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Type definitions
interface AutonomySignal {
  trigger_type: string;
  source: string;
  description: string;
  rule_id: string;
  fingerprint: string;
  evidence_links: {
    anomaly_report?: string;
    metric_graph?: string;
    policy_check?: string;
  };
  remediation_proposal?: string;
}

interface AnomalyReport {
  timestamp: string;
  signals: AutonomySignal[];
}

interface TicketOutput {
  tickets: {
    fingerprint: string;
    issue_number: number;
    url: string;
    action: 'created' | 'updated' | 'skipped';
  }[];
  timestamp: string;
}

const OWNER = process.env.GITHUB_REPOSITORY_OWNER || process.env.OWNER || 'BrianCLong';
const REPO = process.env.GITHUB_REPOSITORY_NAME || process.env.REPO || 'summit';
const REPO_FULL = `${OWNER}/${REPO}`;

function sh(cmd: string): string {
  try {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' }).trim();
  } catch (error: any) {
    console.error(`Error executing command: ${cmd}`);
    console.error(error.stderr || error.message);
    throw error;
  }
}

function generateBody(signal: AutonomySignal, timestamp: string): string {
  const templatePath = path.join(process.cwd(), '.github/ISSUE_TEMPLATE/autonomy_signal.md');
  let template = '';

  if (fs.existsSync(templatePath)) {
    // Basic frontmatter stripping - not robust but sufficient if we control the template
    const content = fs.readFileSync(templatePath, 'utf8');
    const parts = content.split('---');
    template = parts.length > 2 ? parts.slice(2).join('---').trim() : content;
  } else {
    // Fallback template
    template = `### Signal Description\n\n**Type**: {{ trigger_type }}\n**Source**: {{ source }}\n**Detected At**: {{ timestamp }}\n\n### Details\n\n{{ description }}\n\n### Evidence\n\n- [Anomaly Report]({{ anomaly_report_link }})\n- [Metric Graph]({{ metric_graph_link }})\n- [Policy Check]({{ policy_check_link }})\n\n### Proposed Remediation\n\n{{ remediation_proposal }}\n\n### Metadata\n\n- **Rule ID**: {{ rule_id }}\n- **Fingerprint**: {{ fingerprint }}`;
  }

  return template
    .replace('{{ trigger_type }}', signal.trigger_type)
    .replace('{{ source }}', signal.source)
    .replace('{{ timestamp }}', timestamp)
    .replace('{{ description }}', signal.description)
    .replace('{{ anomaly_report_link }}', signal.evidence_links.anomaly_report || '#')
    .replace('{{ metric_graph_link }}', signal.evidence_links.metric_graph || '#')
    .replace('{{ policy_check_link }}', signal.evidence_links.policy_check || '#')
    .replace('{{ remediation_proposal }}', signal.remediation_proposal || 'No automated remediation available.')
    .replace('{{ rule_id }}', signal.rule_id)
    .replace('{{ fingerprint }}', signal.fingerprint);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const inputFile = args.find(arg => !arg.startsWith('--'));

  if (!inputFile) {
    console.error('Usage: tsx scripts/autonomy/create_or_update_issue.ts <anomaly_report.json> [--dry-run]');
    process.exit(1);
  }

  if (dryRun) {
      console.log('DRY RUN MODE ENABLED. No GitHub interactions will be performed.');
  }

  const outputDir = path.join(process.cwd(), 'artifacts/autonomy', new Date().toISOString().split('T')[0]);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const report: AnomalyReport = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const output: TicketOutput = { tickets: [], timestamp: new Date().toISOString() };

  console.log(`Processing ${report.signals.length} signals...`);

  for (const signal of report.signals) {
    // Check if issue exists
    // We search for open issues with label 'autonomy' and 'signal' and the fingerprint in body
    const searchCmd = `gh issue list --repo ${REPO_FULL} --search "${signal.fingerprint} in:body label:autonomy label:signal state:open" --json number,url,title`;

    let existingIssues: any[] = [];
    try {
        existingIssues = JSON.parse(sh(searchCmd));
    } catch (e) {
        console.warn(`Failed to search issues for fingerprint ${signal.fingerprint}, assuming none.`);
    }

    if (existingIssues.length > 0) {
      const issue = existingIssues[0];
      console.log(`Issue exists for ${signal.fingerprint}: #${issue.number}`);

      const commentBody = `**Recurrence detected** at ${report.timestamp}.\nEvidence: ${JSON.stringify(signal.evidence_links)}`;

      if (!dryRun) {
        try {
            sh(`gh issue comment ${issue.number} --repo ${REPO_FULL} --body "${commentBody}"`);
            output.tickets.push({
                fingerprint: signal.fingerprint,
                issue_number: issue.number,
                url: issue.url,
                action: 'updated'
            });
        } catch (e) {
            console.error(`Failed to comment on issue #${issue.number}:`, e);
        }
      } else {
          console.log(`[Dry Run] Would comment on issue #${issue.number}`);
          output.tickets.push({
            fingerprint: signal.fingerprint,
            issue_number: issue.number,
            url: issue.url,
            action: 'updated'
        });
      }
    } else {
      console.log(`Creating new issue for ${signal.fingerprint}`);
      const title = `[SIGNAL] ${signal.trigger_type}: ${signal.source} (${signal.rule_id})`;
      const body = generateBody(signal, report.timestamp);

      if (!dryRun) {
        try {
            // Using file for body to avoid shell escaping hell
            const bodyFile = path.join(outputDir, `body_${signal.fingerprint}.md`);
            fs.writeFileSync(bodyFile, body);

            const createCmd = `gh issue create --repo ${REPO_FULL} --title "${title}" --body-file "${bodyFile}" --label "autonomy,signal"`;
            const resultUrl = sh(createCmd); // Returns URL
            const issueNumber = parseInt(resultUrl.split('/').pop() || '0');

            output.tickets.push({
                fingerprint: signal.fingerprint,
                issue_number: issueNumber,
                url: resultUrl,
                action: 'created'
            });

            fs.unlinkSync(bodyFile); // Cleanup
        } catch (e) {
            console.error(`Failed to create issue for ${signal.fingerprint}:`, e);
        }
      } else {
          console.log(`[Dry Run] Would create issue: ${title}`);
          // Write body to artifact for inspection
          const bodyFile = path.join(outputDir, `body_${signal.fingerprint}.md`);
          fs.writeFileSync(bodyFile, body);
          console.log(`[Dry Run] Body written to ${bodyFile}`);

          output.tickets.push({
            fingerprint: signal.fingerprint,
            issue_number: 0,
            url: 'http://dry-run',
            action: 'created'
        });
      }
    }
  }

  const outputPath = path.join(outputDir, 'tickets.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  const stampPath = path.join(outputDir, 'stamp.json');
  fs.writeFileSync(stampPath, JSON.stringify({
    timestamp: output.timestamp,
    source: inputFile,
    processed_count: report.signals.length,
    ticket_count: output.tickets.length
  }, null, 2));

  console.log(`Done. Output written to ${outputPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
