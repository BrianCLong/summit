"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileTemplate = compileTemplate;
function compileTemplate(template, params, scope) {
    // Mock compiler. In reality, it merges scopes into the template's cypher entrypoint.
    const compiledCypher = `
    MATCH (n {tenantId: $tenantId, workspaceId: $workspaceId})
    /* Cypher entrypoint: ${template.cypher.entrypoint} */
    RETURN n
  `;
    return {
        templateId: template.id,
        compiledCypher,
        parameters: { ...params, tenantId: scope.tenantId, workspaceId: scope.workspaceId },
        budgets: {
            maxDbHits: template.budgets?.maxDbHits || 50000,
            maxRows: template.budgets?.maxRows || 5000,
        },
    };
}
