/**
 * Counterespionage Package
 *
 * Investigation management, case workflows, and counterespionage operations
 */

import { z } from 'zod';

// Case management
export const CounterspyCaseSchema = z.object({
  id: z.string().uuid(),
  caseNumber: z.string(),
  classification: z.enum(['TOP_SECRET', 'SECRET', 'CONFIDENTIAL']),
  caseType: z.enum([
    'ESPIONAGE',
    'INSIDER_THREAT',
    'FOREIGN_INTELLIGENCE',
    'RECRUITMENT',
    'UNAUTHORIZED_DISCLOSURE'
  ]),
  openedDate: z.date(),
  closedDate: z.date().optional(),
  status: z.enum(['PRELIMINARY', 'ACTIVE', 'SURVEILLANCE', 'PROSECUTION', 'CLOSED']),
  subjects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    suspicionLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CONFIRMED'])
  })),
  investigators: z.array(z.string()),
  evidence: z.array(z.object({
    id: z.string(),
    type: z.string(),
    description: z.string(),
    collectionDate: z.date(),
    chainOfCustody: z.array(z.string())
  })),
  surveillanceOps: z.array(z.string()),
  legalAuthorizations: z.array(z.object({
    type: z.string(),
    authorizedBy: z.string(),
    startDate: z.date(),
    endDate: z.date()
  })),
  prosecutionReady: z.boolean(),
  damageAssessment: z.object({
    completed: z.boolean(),
    classifiedMaterialCompromised: z.number(),
    operationalImpact: z.string(),
    financialImpact: z.number().optional()
  }).optional()
});

export type CounterspyCase = z.infer<typeof CounterspyCaseSchema>;

// Double agent management
export const DoubleAgentSchema = z.object({
  id: z.string().uuid(),
  codename: z.string(),
  realIdentity: z.string(),
  recruitedDate: z.date(),
  handler: z.string(),
  foreignService: z.string(),
  foreignHandler: z.string(),
  motivationType: z.enum(['PATRIOTIC', 'FINANCIAL', 'COERCED', 'IDEOLOGICAL']),
  communicationMethods: z.array(z.string()),
  reportingSchedule: z.string(),
  informationFed: z.array(z.object({
    date: z.date(),
    informationType: z.string(),
    deceptionLevel: z.enum(['TRUE', 'PARTIAL', 'FALSE', 'CONTROLLED'])
  })),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  status: z.enum(['ACTIVE', 'DORMANT', 'TERMINATED', 'COMPROMISED'])
});

export type DoubleAgent = z.infer<typeof DoubleAgentSchema>;

// Deception operations
export const DeceptionOperationSchema = z.object({
  id: z.string().uuid(),
  operationName: z.string(),
  classification: z.enum(['TOP_SECRET', 'SECRET']),
  objective: z.string(),
  startDate: z.date(),
  endDate: z.date().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'COMPLETE', 'COMPROMISED']),
  targetService: z.string(),
  deceptionTheme: z.string(),
  channelsUsed: z.array(z.string()),
  successMetrics: z.array(z.string()),
  effectiveness: z.number().min(0).max(100).optional(),
  lessons: z.array(z.string())
});

export type DeceptionOperation = z.infer<typeof DeceptionOperationSchema>;

/**
 * Counterespionage Case Manager
 */
export class CounterspyCaseManager {
  private cases: Map<string, CounterspyCase> = new Map();

  createCase(data: Omit<CounterspyCase, 'id'>): CounterspyCase {
    const newCase: CounterspyCase = {
      ...data,
      id: crypto.randomUUID()
    };

    this.cases.set(newCase.id, newCase);
    return newCase;
  }

  updateCase(id: string, updates: Partial<CounterspyCase>): CounterspyCase | null {
    const existing = this.cases.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates };
    this.cases.set(id, updated);
    return updated;
  }

  addEvidence(caseId: string, evidence: any): boolean {
    const case_ = this.cases.get(caseId);
    if (!case_) return false;

    case_.evidence.push({
      id: crypto.randomUUID(),
      type: evidence.type,
      description: evidence.description,
      collectionDate: new Date(),
      chainOfCustody: [evidence.collectedBy]
    });

    return true;
  }

  getCases(status?: string): CounterspyCase[] {
    const allCases = Array.from(this.cases.values());
    if (status) {
      return allCases.filter(c => c.status === status);
    }
    return allCases;
  }

  assessProsecutionReadiness(caseId: string): boolean {
    const case_ = this.cases.get(caseId);
    if (!case_) return false;

    // Check evidence sufficiency
    const hasEvidence = case_.evidence.length > 0;
    const hasAuthorization = case_.legalAuthorizations.length > 0;
    const hasConfirmedSubject = case_.subjects.some(s => s.suspicionLevel === 'CONFIRMED');

    return hasEvidence && hasAuthorization && hasConfirmedSubject;
  }
}

/**
 * Double Agent Handler
 */
export class DoubleAgentHandler {
  private agents: Map<string, DoubleAgent> = new Map();

  registerAgent(agent: Omit<DoubleAgent, 'id'>): DoubleAgent {
    const newAgent: DoubleAgent = {
      ...agent,
      id: crypto.randomUUID()
    };

    this.agents.set(newAgent.id, newAgent);
    return newAgent;
  }

  feedInformation(agentId: string, info: any): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.informationFed.push({
      date: new Date(),
      informationType: info.type,
      deceptionLevel: info.deceptionLevel
    });

    return true;
  }

  assessAgentRisk(agentId: string): string {
    const agent = this.agents.get(agentId);
    if (!agent) return 'UNKNOWN';

    // Risk assessment logic
    return agent.riskLevel;
  }

  getActiveAgents(): DoubleAgent[] {
    return Array.from(this.agents.values()).filter(a => a.status === 'ACTIVE');
  }
}

export * from './index.js';
