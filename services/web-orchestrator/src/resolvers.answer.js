"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolversAnswer = void 0;
// services/web-orchestrator/src/resolvers.answer.ts
const uuid_1 = require("uuid");
const db_1 = require("./db");
const bandit_contextual_1 = require("../../src/bandit_contextual");
const publisher_1 = require("./publisher");
const resultsConsumer_1 = require("./resultsConsumer"); // subscribe to web.fetch.completed
const synthService_1 = require("./synthService"); // calls Python synth via gRPC/HTTP
exports.resolversAnswer = {
    Mutation: {
        orchestratedAnswer: async (_, { question, contextId }, _ctx) => {
            const id = 'ans_' + (0, uuid_1.v4)();
            const domains = await (0, db_1.domainCandidates)('qna');
            const bandit = new bandit_contextual_1.CtxBandit(domains);
            // naive plan: choose 3 domains
            const picks = Array.from(new Set([bandit.choose(), bandit.choose(), bandit.choose()]));
            // enqueue jobs for relevant paths derived by a simple router (placeholder)
            for (const d of picks) {
                await (0, publisher_1.publishFetch)({
                    id: 'wf_' + (0, uuid_1.v4)(),
                    target: d,
                    path: '/',
                    purpose: 'qna',
                    authorityId: 'auth_public',
                    licenseId: 'lic_docs',
                    extractor: 'article_v2',
                });
            }
            const results = await (0, resultsConsumer_1.gatherResults)({
                contextId,
                max: picks.length,
                timeoutMs: 4000,
            });
            const out = await (0, synthService_1.synthesize)({ question, results, contextId });
            return { id, ...out };
        },
    },
};
