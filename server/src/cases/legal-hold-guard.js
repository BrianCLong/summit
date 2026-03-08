"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.denyWhenHold = void 0;
const denyWhenHold = async (req, reply) => {
    const { id } = req.params;
    const c = await req.db.case.findUnique({ where: { id } });
    if (c?.legalHold) {
        return reply
            .code(423)
            .send({ error: 'Legal hold active: operation locked' });
    }
};
exports.denyWhenHold = denyWhenHold;
