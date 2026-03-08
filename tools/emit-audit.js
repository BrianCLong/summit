#!/usr/bin/env npx ts-node
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
/**
 * Summit Audit Emitter
 *
 * Emits audit events from CI/CD pipelines and deployment scripts to the Summit API.
 *
 * Usage:
 *   ./emit-audit.ts --actor-id ci-bot --action deploy --resource-type service --resource-id my-service --outcome success
 */
const program = new commander_1.Command();
program
    .name('summit-audit')
    .description('Emit audit events to Summit API')
    .version('0.1.0')
    .requiredOption('--api-url <url>', 'Summit API URL (e.g., http://localhost:3000)')
    .requiredOption('--api-key <key>', 'API Key for authentication')
    .requiredOption('--actor-id <id>', 'Actor ID (e.g., github-user, ci-bot)')
    .option('--actor-type <type>', 'Actor Type', 'ci')
    .requiredOption('--action <action>', 'Action performed (e.g., deploy, build, test)')
    .requiredOption('--resource-type <type>', 'Resource Type (e.g., service, repo, artifact)')
    .requiredOption('--resource-id <id>', 'Resource ID')
    .option('--outcome <outcome>', 'Outcome (success, failure, allow, deny)', 'success')
    .option('--trace-id <id>', 'Trace ID')
    .option('--tenant-id <id>', 'Tenant ID', 'system')
    .option('--metadata <json>', 'Additional metadata JSON', '{}')
    .action(async (options) => {
    try {
        const payload = {
            actor: {
                id: options.actorId,
                type: options.actorType,
            },
            action: options.action,
            resource: {
                type: options.resourceType,
                id: options.resourceId,
            },
            decision: {
                outcome: options.outcome,
            },
            traceId: options.traceId || crypto.randomUUID(),
            tenantId: options.tenantId,
            metadata: JSON.parse(options.metadata),
            timestamp: new Date().toISOString(),
        };
        console.log('Emitting audit event:', JSON.stringify(payload, null, 2));
        await axios_1.default.post(`${options.apiUrl}/api/audit/emit`, payload, {
            headers: {
                'Authorization': `Bearer ${options.apiKey}`,
                'Content-Type': 'application/json',
                'x-tenant-id': options.tenantId
            },
        });
        console.log('Successfully emitted audit event');
    }
    catch (error) {
        console.error('Failed to emit audit event:', error.message);
        if (error.response) {
            console.error('Response:', error.response.status, error.response.data);
        }
        process.exit(1);
    }
});
program.parse(process.argv);
