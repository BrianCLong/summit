#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCliArgs = parseCliArgs;
// @ts-nocheck
const pg_1 = require("pg");
const integrity_verifier_js_1 = require("../verification/integrity-verifier.js");
const types_js_1 = require("../core/types.js");
function parseCliArgs(argv) {
    const options = {};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        switch (arg) {
            case '--from':
                options.from = new Date(argv[++i]);
                break;
            case '--to':
                options.to = new Date(argv[++i]);
                break;
            case '--start-seq':
                options.startSequence = BigInt(argv[++i]);
                break;
            case '--end-seq':
                options.endSequence = BigInt(argv[++i]);
                break;
            case '--json':
                options.json = true;
                break;
            default:
                break;
        }
    }
    return options;
}
function buildConfig() {
    return {
        ...types_js_1.DEFAULT_CONFIG,
        postgres: {
            ...types_js_1.DEFAULT_CONFIG.postgres,
            host: process.env.POSTGRES_HOST || types_js_1.DEFAULT_CONFIG.postgres.host,
            port: parseInt(process.env.POSTGRES_PORT || `${types_js_1.DEFAULT_CONFIG.postgres.port}`, 10),
            database: process.env.POSTGRES_DATABASE || types_js_1.DEFAULT_CONFIG.postgres.database,
            user: process.env.POSTGRES_USER || types_js_1.DEFAULT_CONFIG.postgres.user,
            password: process.env.POSTGRES_PASSWORD || types_js_1.DEFAULT_CONFIG.postgres.password,
            ssl: types_js_1.DEFAULT_CONFIG.postgres.ssl,
        },
        signingKey: process.env.AUDIT_SIGNING_KEY || types_js_1.DEFAULT_CONFIG.signingKey,
        publicKeyId: process.env.AUDIT_PUBLIC_KEY_ID || types_js_1.DEFAULT_CONFIG.publicKeyId,
        logLevel: process.env.LOG_LEVEL
            || types_js_1.DEFAULT_CONFIG.logLevel,
        apiHost: types_js_1.DEFAULT_CONFIG.apiHost,
        apiPort: types_js_1.DEFAULT_CONFIG.apiPort,
        maxBufferSize: types_js_1.DEFAULT_CONFIG.maxBufferSize,
        flushIntervalMs: types_js_1.DEFAULT_CONFIG.flushIntervalMs,
        batchSize: types_js_1.DEFAULT_CONFIG.batchSize,
        merkleCheckpointInterval: types_js_1.DEFAULT_CONFIG.merkleCheckpointInterval,
    };
}
async function run() {
    const options = parseCliArgs(process.argv.slice(2));
    const config = buildConfig();
    const pool = new pg_1.Pool({
        host: config.postgres.host,
        port: config.postgres.port,
        database: config.postgres.database,
        user: config.postgres.user,
        password: config.postgres.password,
        ssl: config.postgres.ssl,
        max: config.postgres.poolSize || 10,
    });
    const verifier = new integrity_verifier_js_1.IntegrityVerifier(pool, config);
    try {
        const report = await verifier.verify({
            startTime: options.from,
            endTime: options.to,
            startSequence: options.startSequence,
            endSequence: options.endSequence,
        });
        if (options.json) {
            console.log(JSON.stringify(report, null, 2));
        }
        else {
            console.log(`Audit chain valid: ${report.valid}. Events=${report.summary.totalEvents}, issues=${report.issues.length}`);
        }
        if (!report.valid) {
            process.exitCode = 1;
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Verification failed: ${message}`);
        process.exitCode = 1;
    }
    finally {
        await pool.end();
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    run().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
