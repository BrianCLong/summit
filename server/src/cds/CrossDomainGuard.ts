import { EntityRepo } from '../repos/EntityRepo.js';
import { ABACEngine } from './ABACEngine.js';
import { ContentInspector } from './ContentInspector.js';
import { HardwareEmulator } from './HardwareEmulator.js';
import { TransferRequest, TransferResult, SecurityDomain } from './types.js';
import logger from '../config/logger.js';
import { randomUUID } from 'crypto';

const guardLogger = logger.child({ module: 'CrossDomainGuard' });

export class CrossDomainGuard {
  private abac: ABACEngine;
  private inspector: ContentInspector;
  private diode: HardwareEmulator;
  private entityRepo: EntityRepo;

  constructor(entityRepo: EntityRepo) {
    this.abac = new ABACEngine();
    this.inspector = new ContentInspector();
    this.diode = new HardwareEmulator();
    this.entityRepo = entityRepo;
  }

  // Define domains configuration (could be dynamic/DB-backed)
  private domains: Record<string, SecurityDomain> = {
    'high-side': { id: 'high-side', name: 'High Side', classification: 'TOP_SECRET' },
    'low-side': { id: 'low-side', name: 'Low Side', classification: 'UNCLASSIFIED' },
  };

  async processTransfer(request: TransferRequest): Promise<TransferResult> {
    const { entityId, sourceDomainId, targetDomainId, userContext, justification } = request;
    const transferId = randomUUID();

    guardLogger.info({ transferId, user: userContext.userId, source: sourceDomainId, target: targetDomainId }, 'Initiating Cross-Domain Transfer');

    // 1. Validate Domains
    const sourceDomain = this.domains[sourceDomainId];
    const targetDomain = this.domains[targetDomainId];

    if (!sourceDomain || !targetDomain) {
      return { success: false, timestamp: new Date(), error: 'Invalid source or target domain' };
    }

    // 2. Fetch Entity (Simulate fetching from Source Domain)
    // In reality, we might need to connect to a different DB or Schema.
    // Here we assume tenantId proxies for Domain or we just fetch by ID.
    const entity = await this.entityRepo.findById(entityId);
    if (!entity) {
      return { success: false, timestamp: new Date(), error: 'Entity not found' };
    }

    // 3. Construct Security Label from Entity
    // Assuming props contains security metadata, else default to Source Domain level
    const entityLabel = {
      classification: (entity.props.classification as any) || sourceDomain.classification,
      releasability: (entity.props.releasability as any) || [],
      compartments: (entity.props.compartments as any) || [],
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
      } else {
        await this.diode.sendLowToHigh(entity);
      }
    } catch {
        return { success: false, timestamp: new Date(), error: 'Hardware Diode Fault' };
    }

    // 7. Execute Write on Target (Effectively cloning)
    // We modify the tenantId to "targetDomainId" to simulate it landing in the new domain/tenant.
    const payload = (sourceDomain.classification === 'TOP_SECRET')
        ? this.diode.readHighToLow()
        : this.diode.readLowToHigh();

    if (payload) {
        // Create new entity in target tenant/domain
        // We strip the ID to create a new record
        const { id, ...inputData } = payload;

        // Add provenance/lineage info
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
            tenantId: targetDomainId, // Using Domain ID as Tenant ID for simulation
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
