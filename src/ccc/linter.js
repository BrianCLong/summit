/**
 * @param {{ version: string; clauses: Array<any> }} document
 */
export function lintPolicy(document) {
  const issues = [];
  const seenScopes = new Set();

  for (const clause of document.clauses) {
    if (seenScopes.has(clause.scope)) {
      issues.push({
        level: 'warning',
        clause: clause.scope,
        message: 'Duplicate scope detected; later entries override earlier rules.',
      });
    }
    seenScopes.add(clause.scope);

    if (!clause.allow.length) {
      issues.push({
        level: 'error',
        clause: clause.scope,
        message: 'Clause has no allow entries; all calls will be denied.',
      });
    }

    const seenPurposes = new Set();
    for (const allow of clause.allow) {
      if (seenPurposes.has(allow.purpose)) {
        issues.push({
          level: 'warning',
          clause: clause.scope,
          message: `Purpose "${allow.purpose}" is listed multiple times in allow.`,
        });
      }
      seenPurposes.add(allow.purpose);

      if (!allow.lawfulBasis) {
        issues.push({
          level: 'error',
          clause: clause.scope,
          message: `Purpose "${allow.purpose}" is missing lawful basis`,
        });
      }
    }

    const denies = new Set(clause.deny ?? []);
    for (const denied of denies) {
      if (seenPurposes.has(denied)) {
        issues.push({
          level: 'error',
          clause: clause.scope,
          message: `Purpose "${denied}" is both allowed and denied.`,
        });
      }
    }

    if (clause.fallback === 'allow') {
      issues.push({
        level: 'warning',
        clause: clause.scope,
        message: 'Fallback of allow can introduce ambiguity; prefer explicit purposes.',
      });
    }
  }

  return issues;
}
