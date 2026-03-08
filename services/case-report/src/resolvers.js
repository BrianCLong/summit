"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
exports.resolvers = {
    Query: { case_ping: () => 'ok' },
    Mutation: {
        case_open: (_, { title, sla }) => ({
            id: `c_${Date.now()}`,
            title,
            sla,
            owners: [],
        }),
    },
};
