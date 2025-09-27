import type { ContractDiff, DataContract } from '../types';

const REMEDIATION_TIPS: Record<ContractDiff['category'], string> = {
  schema: 'Ensure schema changes remain backward compatible or versioned.',
  semantics: 'Document business meaning updates and coordinate with consumers.',
  sla: 'Engage reliability owners before modifying SLAs.',
};

export function buildHtmlReport(contract: DataContract, diffs: ContractDiff[]): string {
  const rows = diffs
    .map(
      (diff) => `      <tr class="severity-${diff.severity}">
        <td>${diff.category}</td>
        <td>${diff.field ?? 'n/a'}</td>
        <td>${diff.severity}</td>
        <td>${diff.message}</td>
        <td>${diff.remediation}</td>
      </tr>`
    )
    .join('\n');
  const tipList = Object.entries(REMEDIATION_TIPS)
    .map(([category, tip]) => `<li><strong>${category}:</strong> ${tip}</li>`)
    .join('\n');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${contract.name} Contract Gate Report</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 0.5rem; vertical-align: top; }
      th { background: #0f172a; color: white; }
      tr.severity-breaking { background: #fee2e2; }
      tr.severity-non-breaking { background: #fef9c3; }
      tr.severity-info { background: #ecfeff; }
      .summary { margin-bottom: 1rem; padding: 1rem; background: #f1f5f9; border-radius: 0.5rem; }
    </style>
  </head>
  <body>
    <section class="summary">
      <h1>${contract.name} Contract Gate</h1>
      <p>Version: ${contract.version}</p>
      <p>Schema type: ${contract.schemaType}</p>
    </section>
    <section>
      <h2>Violations</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Field</th>
            <th>Severity</th>
            <th>Message</th>
            <th>Remediation</th>
          </tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </section>
    <section>
      <h2>Remediation Tips</h2>
      <ul>
        ${tipList}
      </ul>
    </section>
  </body>
</html>
`;
}
