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
exports.outboxPublishLoop = outboxPublishLoop;
// Conductor Outbox Publisher (Kafka)
const pg_1 = require("pg");
// Lazy import Kafka to avoid hard dependency if not configured
async function getProducer() {
    const brokers = (process.env.KAFKA || '').split(',').filter(Boolean);
    if (!brokers.length)
        throw new Error('KAFKA not configured');
    const { Kafka } = await Promise.resolve().then(() => __importStar(require('kafkajs')));
    const kafka = new Kafka({ clientId: 'conductor', brokers });
    const producer = kafka.producer();
    await producer.connect();
    return producer;
}
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function outboxPublishLoop() {
    const producer = await getProducer();
    for (;;) {
        const client = await pg.connect();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query(`SELECT id, topic, key, value FROM outbox WHERE sent_at IS NULL ORDER BY id LIMIT 200 FOR UPDATE SKIP LOCKED`);
            if (!rows.length) {
                await client.query('COMMIT');
                await new Promise((r) => setTimeout(r, 500));
                continue;
            }
            const batches = {};
            for (const r of rows) {
                (batches[r.topic] ??= []).push({
                    key: r.key,
                    value: JSON.stringify(r.value),
                });
            }
            await producer.sendBatch({
                topicMessages: Object.entries(batches).map(([topic, messages]) => ({
                    topic,
                    messages,
                })),
            });
            const ids = rows.map((r) => r.id);
            await client.query(`UPDATE outbox SET sent_at = now() WHERE id = ANY($1::bigint[])`, [ids]);
            await client.query('COMMIT');
        }
        catch (e) {
            await client.query('ROLLBACK');
        }
        finally {
            client.release();
        }
    }
}
