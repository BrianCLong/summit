"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestionResolvers = void 0;
const graphql_subscriptions_1 = require("graphql-subscriptions");
exports.ingestionResolvers = {
    Subscription: {
        evidenceIngested: {
            subscribe: (0, graphql_subscriptions_1.withFilter)((parent, args, context) => {
                const engine = context.subscriptionEngine;
                const pubsub = context.pubsub || (engine ? engine.getPubSub() : null);
                if (!pubsub)
                    throw new Error('PubSub not available');
                return pubsub.asyncIterator(['EVIDENCE_INGESTED']);
            }, (payload, variables) => {
                return payload.evidenceIngested.tenantId === variables.tenantId;
            }),
        },
    },
};
