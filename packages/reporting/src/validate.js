/**
 * Lightweight schema-aligned validator to keep reporting package dependency-free.
 * @param {unknown} report
 * @returns {{ valid: true } | { valid: false, errors: string[] }}
 */
export function validateReport(report) {
  const errors = [];

  if (!report || typeof report !== 'object') {
    return { valid: false, errors: ['/ must be an object'] };
  }

  const value = /** @type {Record<string, unknown>} */ (report);

  if (typeof value.schema_version !== 'string') errors.push('/schema_version must be a string');
  if (typeof value.case_id !== 'string' || value.case_id.length < 1) errors.push('/case_id must be a non-empty string');

  if (!Array.isArray(value.claims_used) || value.claims_used.some((claim) => typeof claim !== 'string')) {
    errors.push('/claims_used must be an array of strings');
  }

  if (!Array.isArray(value.evidence_cids) || value.evidence_cids.some((cid) => typeof cid !== 'string')) {
    errors.push('/evidence_cids must be an array of strings');
  }

  if (!Array.isArray(value.sections)) {
    errors.push('/sections must be an array');
  } else {
    value.sections.forEach((section, sectionIndex) => {
      if (!section || typeof section !== 'object') {
        errors.push(`/sections/${sectionIndex} must be an object`);
        return;
      }

      const sectionValue = /** @type {Record<string, unknown>} */ (section);
      if (typeof sectionValue.title !== 'string') {
        errors.push(`/sections/${sectionIndex}/title must be a string`);
      }

      if (!Array.isArray(sectionValue.statements)) {
        errors.push(`/sections/${sectionIndex}/statements must be an array`);
        return;
      }

      sectionValue.statements.forEach((statement, statementIndex) => {
        if (!statement || typeof statement !== 'object') {
          errors.push(`/sections/${sectionIndex}/statements/${statementIndex} must be an object`);
          return;
        }

        const statementValue = /** @type {Record<string, unknown>} */ (statement);
        if (typeof statementValue.text !== 'string') {
          errors.push(`/sections/${sectionIndex}/statements/${statementIndex}/text must be a string`);
        }

        if (
          !Array.isArray(statementValue.claim_cids) ||
          statementValue.claim_cids.length < 1 ||
          statementValue.claim_cids.some((claimCid) => typeof claimCid !== 'string')
        ) {
          errors.push(`/sections/${sectionIndex}/statements/${statementIndex}/claim_cids must be a non-empty array of strings`);
        }
      });
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}
