"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentService = void 0;
const ShardManager_js_1 = require("../graph/partition/ShardManager.js");
const ledger_js_1 = require("../provenance/ledger.js");
const job_manager_js_1 = require("../jobs/job.manager.js");
const job_definitions_js_1 = require("../jobs/job.definitions.js");
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class IntentService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!IntentService.instance) {
            IntentService.instance = new IntentService();
        }
        return IntentService.instance;
    }
    // Enqueue the intent for asynchronous processing
    async enqueueIntent(shardId, actorId, op, payload, policyTags = []) {
        const id = (0, crypto_1.randomUUID)();
        const intent = {
            id,
            shardId,
            actorId,
            ts: Date.now(),
            op,
            payload,
            policyTags
        };
        const queue = job_manager_js_1.jobManager.getQueue(job_definitions_js_1.QueueNames.INTENTS);
        if (!queue) {
            throw new Error(`Queue ${job_definitions_js_1.QueueNames.INTENTS} not initialized`);
        }
        await queue.add('process-intent', intent, {
            jobId: id,
            removeOnComplete: true
        });
        logger_js_1.default.info({ intentId: id, op, shardId }, 'Intent enqueued');
        return id;
    }
    // Apply the intent (executed by worker)
    async applyIntent(intent) {
        logger_js_1.default.info({ intentId: intent.id }, 'Applying intent');
        // 1. Policy Check (Mock)
        await this.checkPolicy(intent);
        // 2. Get Shard Driver
        const shardManager = ShardManager_js_1.ShardManager.getInstance();
        const driver = shardManager.getDriver(intent.shardId);
        if (!driver) {
            throw new Error(`Shard ${intent.shardId} not found or not connected`);
        }
        // 3. Apply Transactional Write
        const session = driver.session();
        let result;
        try {
            result = await session.executeWrite(async (tx) => {
                if (intent.op === 'UPSERT_NODE') {
                    // Simple generic node upsert
                    const { labels, properties, keyField, keyValue } = intent.payload;
                    if (!labels || !keyField || !keyValue) {
                        throw new Error("Invalid UPSERT_NODE payload: missing labels, keyField, or keyValue");
                    }
                    this.validateIdentifier(keyField);
                    const labelList = Array.isArray(labels) ? labels : [labels];
                    labelList.forEach(l => this.validateIdentifier(l));
                    const labelStr = labelList.map(l => `\`${l}\``).join(':');
                    const query = `
            MERGE (n:${labelStr} { ${keyField}: $keyValue })
            SET n += $properties
            RETURN n
          `;
                    return await tx.run(query, { keyValue, properties });
                }
                else if (intent.op === 'UPSERT_EDGE') {
                    // Simple generic edge upsert
                    const { fromKey, toKey, type, properties, fromKeyField, toKeyField } = intent.payload;
                    if (!fromKey || !toKey || !type) {
                        throw new Error("Invalid UPSERT_EDGE payload: missing fromKey, toKey, or type");
                    }
                    this.validateIdentifier(type);
                    // Use provided key fields or default to 'id'
                    const fKey = fromKeyField || 'id';
                    const tKey = toKeyField || 'id';
                    this.validateIdentifier(fKey);
                    this.validateIdentifier(tKey);
                    const query = `
             MATCH (a), (b)
             WHERE a.${fKey} = $fromKey AND b.${tKey} = $toKey
             MERGE (a)-[r:\`${type}\`]->(b)
             SET r += $properties
             RETURN r
           `;
                    return await tx.run(query, { fromKey, toKey, properties });
                }
                else if (intent.op === 'DELETE') {
                    const { keyField, keyValue } = intent.payload;
                    if (!keyField || !keyValue) {
                        throw new Error("Invalid DELETE payload: missing keyField or keyValue");
                    }
                    this.validateIdentifier(keyField);
                    const query = `
              MATCH (n { ${keyField}: $keyValue })
              DETACH DELETE n
            `;
                    return await tx.run(query, { keyValue });
                }
                throw new Error(`Unsupported operation: ${intent.op}`);
            });
        }
        finally {
            await session.close();
        }
        // 4. Record Provenance
        await ledger_js_1.provenanceLedger.appendEntry({
            tenantId: 'system', // TODO: derive from intent or actor
            actionType: 'INTENT_APPLIED',
            resourceType: 'GraphEntity',
            resourceId: intent.id,
            actorId: intent.actorId,
            actorType: 'user', // or system
            timestamp: new Date(),
            payload: {
                mutationType: intent.op === 'DELETE' ? 'DELETE' : 'UPDATE',
                entityId: intent.payload?.id || intent.id,
                entityType: intent.payload?.type || 'GraphEntity',
                intentId: intent.id,
                shardId: intent.shardId,
                op: intent.op,
                status: 'SUCCESS'
            },
            metadata: { policyTags: intent.policyTags }
        });
        return result;
    }
    async checkPolicy(intent) {
        // Mock Policy Check
        // In a real scenario, call OPA or similar.
        // For now, fail if policyTags includes 'deny-all'
        if (intent.policyTags.includes('deny-all')) {
            throw new Error('POLICY_DENY: deny-all tag present');
        }
        // TODO: Add more sophisticated logic
    }
    validateIdentifier(value) {
        if (!/^[a-zA-Z0-9_]+$/.test(value)) {
            throw new Error(`Invalid identifier: ${value}. Must be alphanumeric/underscore only.`);
        }
    }
}
exports.IntentService = IntentService;
