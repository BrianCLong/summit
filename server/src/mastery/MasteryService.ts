import { randomUUID } from 'crypto';
import { LabDefinition, LabRun, LabRunStep, Certificate } from './types.js';
import { analystILabs } from './definitions/analyst-i.js';
import { provenanceLedger } from '../provenance/ledger.js';

export class MasteryService {
  private labs: Map<string, LabDefinition> = new Map();
  // In-memory storage for active runs (prototype). In prod, use DB.
  private runs: Map<string, LabRun> = new Map();

  constructor() {
    analystILabs.forEach(lab => this.labs.set(lab.id, lab));
  }

  getLabs(): LabDefinition[] {
    return Array.from(this.labs.values());
  }

  getLab(labId: string): LabDefinition | undefined {
      return this.labs.get(labId);
  }

  startLab(labId: string, userId: string, tenantId: string): LabRun {
    const lab = this.labs.get(labId);
    if (!lab) throw new Error('Lab not found');

    const runId = randomUUID();

    // Log start (async)
    provenanceLedger.appendEntry({
        tenantId,
        actionType: 'LAB_START',
        resourceType: 'lab_run',
        resourceId: runId,
        actorId: userId,
        actorType: 'user',
        timestamp: new Date(),
        payload: {
            mutationType: 'CREATE',
            entityId: runId,
            entityType: 'LabRun',
            labId
        },
        metadata: { version: lab.version }
    }).catch(err => console.error('Failed to log lab start', err));
    const run: LabRun = {
      runId,
      labId,
      userId,
      tenantId,
      status: 'in_progress',
      startTime: new Date(),
      steps: {},
      currentStepId: lab.steps[0].id
    };

    // Initialize steps
    lab.steps.forEach(step => {
      run.steps[step.id] = {
        stepId: step.id,
        status: 'pending'
      };
    });

    this.runs.set(runId, run);
    return run;
  }

  getRun(runId: string): LabRun | undefined {
    return this.runs.get(runId);
  }

  getUserRuns(userId: string): LabRun[] {
      return Array.from(this.runs.values()).filter(r => r.userId === userId);
  }

  async validateStep(runId: string, stepId: string): Promise<{ success: boolean; message?: string }> {
    const run = this.runs.get(runId);
    if (!run) throw new Error('Run not found');

    const lab = this.labs.get(run.labId);
    if (!lab) throw new Error('Lab definition not found');

    const stepDef = lab.steps.find(s => s.id === stepId);
    if (!stepDef) throw new Error('Step definition not found');

    // Logic to validate
    const validation = stepDef.validation;
    let success = false;
    let message = '';

    try {
        if (validation.type === 'manual') {
        success = true;
        } else if (validation.type === 'provenance_event') {
        // Search provenance ledger for event since run.startTime
        // Note: getEntries returns promises
        const entries = await provenanceLedger.getEntries(run.tenantId, {
            actionType: validation.config.actionType,
            limit: 100 // Look at recent 100 entries of this type
        });

        // Filter: must be after start time and by this user
        const match = entries.find(e => {
            const timeMatch = new Date(e.timestamp) >= run.startTime;
            const actorMatch = e.actorId === run.userId;

            // Optional: Check payload match
            let payloadMatch = true;
            if (validation.config.payload) {
                // Simple subset match
                payloadMatch = Object.entries(validation.config.payload).every(([k, v]) =>
                    e.payload && e.payload[k] === v
                );
            }
            // Optional: Check metadata match
            let metadataMatch = true;
             if (validation.config.metadata) {
                metadataMatch = Object.entries(validation.config.metadata).every(([k, v]) =>
                    e.metadata && (e.metadata as any)[k] === v
                );
            }

            return timeMatch && actorMatch && payloadMatch && metadataMatch;
        });

        if (match) success = true;
        else message = `Action ${validation.config.actionType} not found for user since lab started.`;

        } else if (validation.type === 'custom_check') {
            if (validation.config.checkName === 'all_claims_cited') {
                // Mock check logic
                // TODO: Implement deep verification of citations against Hypothesis service
                success = true;
            } else {
                message = 'Unknown custom check';
            }
        }
    } catch (err: any) {
        message = `Validation error: ${err.message}`;
    }

    if (success) {
      const stepState = run.steps[stepId];
      if (stepState.status !== 'completed') {
        stepState.status = 'completed';
        stepState.completedAt = new Date();

        // Advance to next step
        const currentIndex = lab.steps.findIndex(s => s.id === stepId);
        if (currentIndex < lab.steps.length - 1) {
            run.currentStepId = lab.steps[currentIndex + 1].id;
        } else {
            run.status = 'completed';
            run.endTime = new Date();

            // Log completion to ledger (persisted state)
            try {
                 await provenanceLedger.appendEntry({
                    tenantId: run.tenantId,
                    actionType: 'LAB_COMPLETE',
                    resourceType: 'lab_run',
                    resourceId: run.runId,
                    actorId: run.userId,
                    actorType: 'user',
                    timestamp: new Date(),
                    payload: {
                        mutationType: 'UPDATE',
                        entityId: run.runId,
                        entityType: 'LabRun',
                        labId: run.labId,
                        steps: run.steps
                    },
                    metadata: {}
                });
            } catch (err: any) {
                 console.error('Failed to log lab completion', err);
            }

            await this.checkCertification(run);
        }
      }
    }

    return { success, message };
  }

  // Helper to fetch completed labs from ledger
  private async getCompletedLabIds(userId: string, tenantId: string): Promise<Set<string>> {
    try {
        const entries = await provenanceLedger.getEntries(tenantId, {
            actionType: 'LAB_COMPLETE',
            limit: 1000 // reasonable limit
        });
        const completed = new Set<string>();
        entries.filter(e => e.actorId === userId).forEach(e => {
            if (e.payload && e.payload.labId) {
                completed.add(e.payload.labId);
            }
        });
        return completed;
    } catch (err: any) {
        console.error('Failed to fetch completed labs', err);
        return new Set();
    }
  }

  async checkCertification(run: LabRun) {
    const requiredLabs = ['lab-1-ingest-map', 'lab-2-resolve-reconcile', 'lab-3-hypothesis'];

    const completedLabs = await this.getCompletedLabIds(run.userId, run.tenantId);
    // Add current run just in case ledger isn't consistent yet (read-your-writes issue) or if getEntries is slow
    completedLabs.add(run.labId);

    if (requiredLabs.every(id => completedLabs.has(id))) {
      await this.issueCertificate(run.userId, run.tenantId, 'Analyst I');
    }
  }

  async issueCertificate(userId: string, tenantId: string, certName: string) {
    const existingCerts = await this.getUserCertificates(userId, tenantId);
    if (existingCerts.some(c => c.name === certName)) return;

    const certId = randomUUID();
    const cert: Certificate = {
      id: certId,
      userId,
      tenantId,
      name: certName,
      grantedAt: new Date(),
      version: '1.0',
      issuer: 'System'
    };

    await provenanceLedger.appendEntry({
        tenantId,
        actionType: 'CERTIFICATE_ISSUED',
        resourceType: 'certificate',
        resourceId: certId,
        actorId: userId,
        actorType: 'system',
        timestamp: new Date(),
        payload: {
            mutationType: 'CREATE',
            entityId: certId,
            entityType: 'Certificate',
            certificate: cert
        },
        metadata: {}
    });
  }

  async getUserCertificates(userId: string, tenantId?: string): Promise<Certificate[]> {
    if (!tenantId) return []; // Needs tenantId for ledger query
    try {
        const entries = await provenanceLedger.getEntries(tenantId, {
            actionType: 'CERTIFICATE_ISSUED',
            limit: 100
        });
        return entries
            .filter(e => e.actorId === userId || (e.payload as any).certificate?.userId === userId)
            .map(e => (e.payload as any).certificate as Certificate)
            .filter(c => !!c);
    } catch (e: any) {
        console.error('Failed to fetch user certificates', e);
        return [];
    }
  }

  getAllRuns(): LabRun[] {
      return Array.from(this.runs.values());
  }

  // Coaching Feedback Loop
  getSuggestedLabs(tripwireType: string): LabDefinition[] {
      // Map tripwire/alert types to labs
      // e.g. 'unverified_ingest' -> Lab 1
      // 'bad_merge' -> Lab 2
      // 'uncited_claim' -> Lab 3
      const map: Record<string, string> = {
          'unverified_ingest': 'lab-1-ingest-map',
          'bad_merge': 'lab-2-resolve-reconcile',
          'uncited_claim': 'lab-3-hypothesis',
          'compliance_violation': 'lab-3-hypothesis'
      };

      const labId = map[tripwireType];
      if (labId) {
          const lab = this.labs.get(labId);
          return lab ? [lab] : [];
      }
      return [];
  }
}

export const masteryService = new MasteryService();
