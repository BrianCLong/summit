export const policy = {
    assert(user, scope, ctx) {
        if (!user)
            throw new Error('unauthorized');
        // Classification levels
        const classificationLevels = {
            PUBLIC: 0,
            CONFIDENTIAL: 1,
            RESTRICTED: 2,
            SECRET: 3,
            TS: 4, // Top Secret
            'TS-SCI': 5, // Top Secret - Sensitive Compartmented Information
        };
        // User's highest classification level
        const userClassification = user.classification
            ? classificationLevels[user.classification.toUpperCase()]
            : -1;
        // Check for case membership if 'case:read' scope is present
        if (scope.includes('case:read')) {
            const caseId = ctx.args?.caseId ?? ctx.args?.id;
            if (!user.cases?.includes(caseId)) {
                throw new Error('forbidden: not a member of this case');
            }
        }
        // Check for classification level
        for (const s of scope) {
            if (s.startsWith('classification:')) {
                const requiredClassification = s.split(':')[1].toUpperCase();
                if (classificationLevels[requiredClassification] === undefined) {
                    console.warn(`Unknown classification level in scope: ${requiredClassification}`);
                    continue;
                }
                if (userClassification < classificationLevels[requiredClassification]) {
                    throw new Error(`forbidden: insufficient classification (${user.classification || 'none'} < ${requiredClassification})`);
                }
            }
        }
        // Extend with org/role/classification as needed
        // Example: tenant match (assuming user.tenantId and args.tenantId)
        if (scope.includes('tenant:match')) {
            const targetTenantId = ctx.args?.tenantId;
            if (targetTenantId && user.tenantId !== targetTenantId) {
                throw new Error('forbidden: tenant mismatch');
            }
        }
    },
};
//# sourceMappingURL=policy.js.map