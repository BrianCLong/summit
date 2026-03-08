"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossDomainGuard = void 0;
const ABACEngine_js_1 = require("./ABACEngine.js");
const ContentInspector_js_1 = require("./ContentInspector.js");
const HardwareEmulator_js_1 = require("./HardwareEmulator.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const crypto_1 = require("crypto");
const guardLogger = logger_js_1.default.child({ module: 'CrossDomainGuard' });
class CrossDomainGuard {
    abac;
    inspector;
    diode;
    entityRepo;
    constructor(entityRepo) {
        this.abac = new ABACEngine_js_1.ABACEngine();
        this.inspector = new ContentInspector_js_1.ContentInspector();
        this.diode = new HardwareEmulator_js_1.HardwareEmulator();
        this.entityRepo = entityRepo;
    }
    // Define domains configuration (could be dynamic/DB-backed)
    domains = {
        'high-side': { id: 'high-side', name: 'High Side', classification: 'TOP_SECRET' },
        'low-side': { id: 'low-side', name: 'Low Side', classification: 'UNCLASSIFIED' },
    };
    async processTransfer(request) {
        const { entityId, sourceDomainId, targetDomainId, userContext, justification } = request;
        const transferId = (0, crypto_1.randomUUID)();
        guardLogger.info({ transferId, user: userContext.userId, source: sourceDomainId, target: targetDomainId }, 'Initiating Cross-Domain Transfer');
        // 1. Validate Domains
        const sourceDomain = this.domains[sourceDomainId];
        const targetDomain = this.domains[targetDomainId];
        if (!sourceDomain || !targetDomain) {
            return { success: false, timestamp: new Date(), error: 'Invalid source or target domain' };
        }
        // 2. Fetch Entity (Simulate fetching from Source Domain)
        const entity = await this.entityRepo.findById(entityId);
        if (!entity) {
            return { success: false, timestamp: new Date(), error: 'Entity not found' };
        }
        // 3. Construct Security Label from Entity
        const entityLabel = {
            classification: entity.props.classification || sourceDomain.classification,
            releasability: entity.props.releasability || [],
            compartments: entity.props.compartments || [],
        };
        // 4. ABAC Policy Check
        const decision = this.abac.canTransfer(userContext, entityLabel, sourceDomain, targetDomain);
        if (!decision.allowed) {
            guardLogger.warn({ transferId, reason: decision.reason }, 'Transfer denied by ABAC policy');
            return { success: false, timestamp: new Date(), error: `Access Denied: ${decision.reason}` };
        }
        // 5. Deep Content Inspection
        const inspection = this.inspector.inspect(entity, targetDomain.classification);
        if (!inspection.passed) {
            guardLogger.warn({ transferId, issues: inspection.issues }, 'Transfer blocked by Content Inspection');
            return { success: false, timestamp: new Date(), error: `Content Inspection Failed: ${inspection.issues.join(', ')}` };
        }
        // 6. Simulate Diode Transfer
        try {
            if (sourceDomain.classification === 'TOP_SECRET' && targetDomain.classification !== 'TOP_SECRET') {
                await this.diode.sendHighToLow(entity);
            }
            else {
                await this.diode.sendLowToHigh(entity);
            }
        }
        catch {
            return { success: false, timestamp: new Date(), error: 'Hardware Diode Fault' };
        }
        // 7. Execute Write on Target
        const payload = (sourceDomain.classification === 'TOP_SECRET')
            ? this.diode.readHighToLow()
            : this.diode.readLowToHigh();
        if (payload) {
            const { id, ...inputData } = payload;
            const newProps = {
                ...inputData.props,
                _cds_provenance: {
                    originalId: id,
                    sourceDomain: sourceDomainId,
                    transferId,
                    transferredBy: userContext.userId,
                    justification,
                    timestamp: new Date().toISOString()
                }
            };
            await this.entityRepo.create({
                tenantId: targetDomainId,
                kind: inputData.kind,
                labels: inputData.labels,
                props: newProps
            }, userContext.userId);
            guardLogger.info({ transferId }, 'Cross-Domain Transfer Successful');
            return { success: true, transferId, timestamp: new Date() };
        }
        return { success: false, timestamp: new Date(), error: 'Transfer simulation failed' };
    }
}
exports.CrossDomainGuard = CrossDomainGuard;
