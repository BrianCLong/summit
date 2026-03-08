"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const briefResolvers = {
    Query: {
        brief: (_, { id }) => ({ id, title: 'Draft' }),
    },
    Mutation: {},
};
exports.default = briefResolvers;
