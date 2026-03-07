/**
 * GraphRAG Retrieval Policy - Scoped traversal firewalls.
 */
export class QueryPolicyEnforcer {
  validateTraversal(startNode: string, endNode: string, relationship: string): boolean {
    // 23rd Order Invariant: Observations != Facts
    // Do not allow automatic promotion of GDELT observations to Facts without explicit policy approval.

    if (relationship === 'SUPPORTS' && startNode.startsWith('GDELT_')) {
      console.warn('Blocked automatic fact promotion from GDELT observation');
      return false;
    }

    return true;
  }

  applyBudgetLimits(query: string): string {
    // Enforce LIMIT on all open-ended traversals
    const upperQuery = query.toUpperCase();
    if (!upperQuery.includes(' LIMIT ') && !upperQuery.endsWith(' LIMIT')) {
      return `${query} LIMIT 100`;
    }
    return query;
  }
}
