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
exports.RollbackEngine = void 0;
const ledger_js_1 = require("../../src/provenance/ledger.js");
// Mock external services for demonstration
const mockKubernetesClient = {
    rollbackDeployment: async (deploymentName) => {
        console.log(`[MockKubernetes] Rolling back deployment ${deploymentName} to previous revision.`);
        // In a real implementation, this would use the Kubernetes API to trigger a deployment rollback.
    },
};
const mockDbMigrator = {
    runDownMigrations: async (steps) => {
        console.log(`[MockDbMigrator] Running ${steps} down migration(s).`);
        // Execute the rollback script
        try {
            const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            const scriptPath = path.resolve(process.cwd(), 'server/scripts/db_rollback.cjs');
            console.log(`[RollbackEngine] Executing: npx tsx ${scriptPath} --steps=${steps}`);
            await new Promise((resolve, reject) => {
                exec(`npx tsx ${scriptPath} --steps=${steps}`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`[RollbackEngine] Rollback script failed: ${error.message}`);
                        reject(error);
                        return;
                    }
                    if (stderr)
                        console.error(`[RollbackEngine] stderr: ${stderr}`);
                    if (stdout)
                        console.log(`[RollbackEngine] stdout: ${stdout}`);
                    resolve();
                });
            });
        }
        catch (e) {
            console.error(`[RollbackEngine] Failed to execute rollback script:`, e);
        }
    },
};
class RollbackEngine {
    rollbackHistory = [];
    async performRollback(options) {
        console.log(`Starting rollback for service ${options.serviceName} due to: ${options.reason}`);
        let success = false;
        try {
            if (options.migrationSteps && options.migrationSteps > 0) {
                await this.coordinateDatabaseRollback(options.migrationSteps);
            }
            await this.performServiceRollback(options.serviceName);
            success = true;
            console.log('Rollback completed successfully.');
            // Record evidence in Provenance Ledger
            try {
                await ledger_js_1.provenanceLedger.appendEntry({
                    tenantId: options.tenantId,
                    actorId: options.actorId,
                    actorType: 'system',
                    actionType: 'ROLLBACK_EXECUTED',
                    resourceType: 'Deployment',
                    resourceId: options.serviceName,
                    timestamp: new Date(),
                    payload: {
                        mutationType: 'CREATE',
                        entityId: options.serviceName,
                        entityType: 'Deployment',
                        newState: {
                            id: options.serviceName,
                            type: 'Deployment',
                            version: 1,
                            data: {
                                reason: options.reason,
                                migrationSteps: options.migrationSteps,
                                success: true,
                            },
                            metadata: {},
                        },
                        reason: options.reason,
                        migrationSteps: options.migrationSteps,
                        success: true
                    },
                    metadata: {
                        purpose: 'Canary Auto-Rollback',
                        component: 'RollbackEngine'
                    }
                });
                console.log('Rollback evidence recorded in Provenance Ledger.');
            }
            catch (ledgerError) {
                console.error('Failed to record rollback evidence:', ledgerError);
                // We don't fail the rollback itself if logging fails, but we log the error.
            }
        }
        catch (error) {
            console.error('Rollback failed:', error);
            // Record failure evidence
            try {
                await ledger_js_1.provenanceLedger.appendEntry({
                    tenantId: options.tenantId,
                    actorId: options.actorId,
                    actorType: 'system',
                    actionType: 'ROLLBACK_FAILED',
                    resourceType: 'Deployment',
                    resourceId: options.serviceName,
                    timestamp: new Date(),
                    payload: {
                        mutationType: 'CREATE',
                        entityId: options.serviceName,
                        entityType: 'Deployment',
                        newState: {
                            id: options.serviceName,
                            type: 'Deployment',
                            version: 1,
                            data: {
                                reason: options.reason,
                                error: error.message,
                                success: false,
                            },
                            metadata: {},
                        },
                        reason: options.reason,
                        error: error.message,
                        success: false
                    },
                    metadata: {
                        purpose: 'Canary Auto-Rollback',
                        component: 'RollbackEngine'
                    }
                });
            }
            catch (ledgerError) {
                console.error('Failed to record rollback failure evidence:', ledgerError);
            }
        }
        finally {
            this.logRollback(options, success);
        }
        return success;
    }
    async coordinateDatabaseRollback(steps) {
        console.log(`Coordinating database migration rollback of ${steps} step(s)...`);
        await mockDbMigrator.runDownMigrations(steps);
    }
    async performServiceRollback(serviceName) {
        console.log(`Rolling back service ${serviceName}...`);
        await mockKubernetesClient.rollbackDeployment(serviceName);
    }
    logRollback(options, success) {
        const record = {
            timestamp: new Date(),
            serviceName: options.serviceName,
            reason: options.reason,
            success,
        };
        this.rollbackHistory.push(record);
        console.log("Rollback audit record created:", record);
    }
    getRollbackHistory() {
        return this.rollbackHistory;
    }
}
exports.RollbackEngine = RollbackEngine;
