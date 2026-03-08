"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const aiInfluenceCampaign_resolvers_1 = require("../../api/graphql/ontology/aiInfluenceCampaign.resolvers");
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
(0, node_test_1.describe)('GraphQL AI Influence Campaign Resolvers', () => {
    (0, node_test_1.it)('should resolve aiInfluenceCampaign with mocked data', async () => {
        const context = {};
        const result = await aiInfluenceCampaign_resolvers_1.resolvers.Query.aiInfluenceCampaign(null, { campaignId: 'camp_test' }, context);
        assert.strictEqual(result.campaignId, 'camp_test');
        assert.ok(result.actorIds.includes('actor_example'));
        assert.ok(result.evidenceIds.includes('EVID:ai-influence-campaign:evidence:0001'));
    });
    (0, node_test_1.it)('should resolve aiInfluenceCampaignsByTactic to empty array', async () => {
        const context = {};
        const result = await aiInfluenceCampaign_resolvers_1.resolvers.Query.aiInfluenceCampaignsByTactic(null, { tacticId: 'test_tactic' }, context);
        assert.strictEqual(Array.isArray(result), true);
        assert.strictEqual(result.length, 0);
    });
});
