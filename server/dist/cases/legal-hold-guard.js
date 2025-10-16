export const denyWhenHold = async (req, reply) => {
    const { id } = req.params;
    const c = await req.db.case.findUnique({ where: { id } });
    if (c?.legalHold) {
        return reply
            .code(423)
            .send({ error: 'Legal hold active: operation locked' });
    }
};
//# sourceMappingURL=legal-hold-guard.js.map