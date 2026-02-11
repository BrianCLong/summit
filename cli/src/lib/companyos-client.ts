/**
 * CompanyOS API Client for CLI
 */

const BASE_URL = process.env.COMPANYOS_BASE_URL || 'http://localhost:4000/api';

export async function simulatePolicy(input: any) {
  const res = await fetch(\`\${BASE_URL}/policy/simulate\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(\`Simulation failed: \${res.statusText}\`);
  return res.json();
}

export async function createApprovalRequest(input: any) {
  const res = await fetch(\`\${BASE_URL}/approvals\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(\`Failed to create approval: \${res.statusText}\`);
  return res.json();
}

export async function listApprovals(tenantId?: string) {
  const url = new URL(\`\${BASE_URL}/approvals\`);
  if (tenantId) url.searchParams.append('tenantId', tenantId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(\`Failed to list approvals: \${res.statusText}\`);
  return res.json();
}

export async function decideApproval(id: string, status: string, approverId: string, rationale: string) {
  const res = await fetch(\`\${BASE_URL}/approvals/\${id}\`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, approverId, rationale }),
  });
  if (!res.ok) throw new Error(\`Failed to decide approval: \${res.statusText}\`);
  return res.json();
}

export async function emitReceipt(input: any) {
  const res = await fetch(\`\${BASE_URL}/receipts\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(\`Failed to emit receipt: \${res.statusText}\`);
  return res.json();
}

export async function getReceipt(id: string) {
  const res = await fetch(\`\${BASE_URL}/receipts/\${id}\`);
  if (!res.ok) throw new Error(\`Failed to get receipt: \${res.statusText}\`);
  return res.json();
}

export async function searchAudit(filters: any) {
  const url = new URL(\`\${BASE_URL}/receipts\`);
  if (filters.tenantId) url.searchParams.append('tenantId', filters.tenantId);
  if (filters.actorId) url.searchParams.append('actorId', filters.actorId);
  if (filters.actionType) url.searchParams.append('actionType', filters.actionType);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(\`Failed to search audit: \${res.statusText}\`);
  return res.json();
}
