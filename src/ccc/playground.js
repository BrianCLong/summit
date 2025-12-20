/**
 * @param {{version: string; generatedAt: string; scopes: Record<string, Record<string, string>>}} policy
 * @param {Array<{name: string; scope: string; purpose: string}>} calls
 */
export function evaluateCalls(policy, calls) {
  return calls.map((call) => {
    const allowedScope = policy.scopes[call.scope];
    if (!allowedScope) {
      return {
        ...call,
        allowed: false,
        reason: `Unknown scope ${call.scope}`,
      };
    }
    const lawfulBasis = allowedScope[call.purpose];
    if (!lawfulBasis) {
      return {
        ...call,
        allowed: false,
        reason: `Purpose ${call.purpose} is not permitted for scope ${call.scope}`,
      };
    }

    return {
      ...call,
      allowed: true,
      lawfulBasis,
    };
  });
}

/**
 * @param {Array<{name: string; scope: string; purpose: string; allowed: boolean; lawfulBasis?: string; reason?: string}>} results
 */
export function formatPlaygroundResults(results) {
  const rows = [
    ['API', 'Scope', 'Purpose', 'Allowed', 'Lawful Basis / Reason'],
    ...results.map((result) => [
      result.name,
      result.scope,
      result.purpose,
      result.allowed ? 'yes' : 'no',
      result.allowed ? result.lawfulBasis ?? '' : result.reason ?? '',
    ]),
  ];

  const widths = rows[0].map((_, columnIndex) =>
    Math.max(...rows.map((row) => row[columnIndex].length))
  );

  const formatRow = (row) =>
    row
      .map((cell, index) => cell.padEnd(widths[index]))
      .join(' | ')
      .trim();

  return rows.map(formatRow).join('\n');
}
