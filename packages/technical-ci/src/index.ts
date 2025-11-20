/**
 * Technical Counterintelligence Package
 *
 * TSCM operations, RF monitoring, TEMPEST, and technical security
 */

import { z } from 'zod';

// TSCM Sweep Operation
export const TSCMSweepSchema = z.object({
  id: z.string().uuid(),
  location: z.string(),
  scheduledDate: z.date(),
  completedDate: z.date().optional(),
  sweepType: z.enum([
    'ROUTINE',
    'TRIGGERED',
    'PRE_CLASSIFIED_DISCUSSION',
    'POST_INCIDENT',
    'COMPREHENSIVE'
  ]),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  team: z.array(z.object({
    memberId: z.string(),
    role: z.enum(['LEAD', 'TECHNICIAN', 'ANALYST', 'SECURITY'])
  })),
  areasSwept: z.array(z.object({
    area: z.string(),
    size: z.number(),
    classification: z.string()
  })),
  equipmentUsed: z.array(z.string()),
  findings: z.array(z.object({
    id: z.string(),
    type: z.enum([
      'AUDIO_DEVICE',
      'VIDEO_DEVICE',
      'RF_TRANSMITTER',
      'RECORDER',
      'IMPLANT',
      'NETWORK_TAP',
      'ANOMALY'
    ]),
    location: z.string(),
    frequency: z.number().optional(),
    description: z.string(),
    threatLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    neutralized: z.boolean()
  })),
  clearanceStatus: z.enum(['CLEAR', 'CONDITIONAL', 'NOT_CLEAR']),
  nextSweepDate: z.date().optional(),
  reportId: z.string().optional()
});

export type TSCMSweep = z.infer<typeof TSCMSweepSchema>;

// RF Spectrum Monitoring
export const RFMonitoringSessionSchema = z.object({
  id: z.string().uuid(),
  location: z.string(),
  startTime: z.date(),
  endTime: z.date().optional(),
  frequencyRange: z.object({
    start: z.number(),
    end: z.number(),
    unit: z.enum(['MHz', 'GHz'])
  }),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED']),
  detections: z.array(z.object({
    timestamp: z.date(),
    frequency: z.number(),
    signalStrength: z.number(),
    modulation: z.string().optional(),
    duration: z.number(),
    classification: z.enum(['AUTHORIZED', 'UNKNOWN', 'SUSPICIOUS', 'HOSTILE']),
    source: z.string().optional()
  })),
  baselineEstablished: z.boolean(),
  anomaliesDetected: z.number(),
  actionsTaken: z.array(z.string())
});

export type RFMonitoringSession = z.infer<typeof RFMonitoringSessionSchema>;

// TEMPEST/Emissions Security
export const TEMPESTAssessmentSchema = z.object({
  id: z.string().uuid(),
  facility: z.string(),
  assessmentDate: z.date(),
  assessor: z.string(),
  equipmentTested: z.array(z.object({
    equipment: z.string(),
    type: z.string(),
    location: z.string(),
    classification: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'])
  })),
  emissionsDetected: z.array(z.object({
    source: z.string(),
    emissionType: z.enum([
      'RF',
      'ACOUSTIC',
      'OPTICAL',
      'SEISMIC',
      'ELECTROMAGNETIC'
    ]),
    distance: z.number(),
    dataRecoverable: z.boolean(),
    riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  })),
  vulnerabilities: z.array(z.string()),
  recommendations: z.array(z.object({
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    recommendation: z.string(),
    costEstimate: z.number().optional(),
    implementationTime: z.string()
  })),
  complianceStatus: z.enum(['COMPLIANT', 'MINOR_ISSUES', 'MAJOR_ISSUES', 'NON_COMPLIANT']),
  nextAssessment: z.date()
});

export type TEMPESTAssessment = z.infer<typeof TEMPESTAssessmentSchema>;

// Supply Chain Security
export const SupplyChainSecuritySchema = z.object({
  id: z.string().uuid(),
  vendor: z.string(),
  component: z.string(),
  assessmentDate: z.date(),
  riskFactors: z.array(z.object({
    factor: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    description: z.string()
  })),
  countryOfOrigin: z.string(),
  manufacturingLocations: z.array(z.string()),
  trustLevel: z.enum(['TRUSTED', 'CONDITIONAL', 'UNTRUSTED', 'PROHIBITED']),
  inspectionRequired: z.boolean(),
  inspectionResults: z.object({
    completed: z.boolean(),
    findings: z.array(z.string()),
    approved: z.boolean()
  }).optional(),
  alternativeVendors: z.array(z.string()),
  approvalStatus: z.enum(['APPROVED', 'CONDITIONAL', 'DENIED', 'PENDING'])
});

export type SupplyChainSecurity = z.infer<typeof SupplyChainSecuritySchema>;

// Hardware Implant Detection
export const ImplantDetectionSchema = z.object({
  id: z.string().uuid(),
  device: z.string(),
  serialNumber: z.string(),
  inspectionDate: z.date(),
  inspector: z.string(),
  inspectionMethod: z.enum([
    'VISUAL',
    'XRAY',
    'THERMAL',
    'RF_TESTING',
    'FIRMWARE_ANALYSIS',
    'COMPREHENSIVE'
  ]),
  findings: z.array(z.object({
    component: z.string(),
    anomaly: z.string(),
    suspicionLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CONFIRMED']),
    description: z.string(),
    evidence: z.array(z.string())
  })),
  implantDetected: z.boolean(),
  deviceStatus: z.enum(['CLEARED', 'QUARANTINED', 'DESTROYED']),
  forensicAnalysis: z.boolean(),
  reportId: z.string().optional()
});

export type ImplantDetection = z.infer<typeof ImplantDetectionSchema>;

// Covert Channel Analysis
export const CovertChannelSchema = z.object({
  id: z.string().uuid(),
  detectedDate: z.date(),
  channelType: z.enum([
    'TIMING',
    'STORAGE',
    'NETWORK',
    'SIDE_CHANNEL',
    'ACOUSTIC',
    'OPTICAL',
    'ELECTROMAGNETIC'
  ]),
  source: z.string(),
  destination: z.string(),
  bandwidth: z.number(),
  detectionMethod: z.string(),
  dataExfiltrated: z.object({
    detected: z.boolean(),
    volume: z.number().optional(),
    classification: z.string().optional()
  }),
  mitigationApplied: z.array(z.string()),
  channelClosed: z.boolean(),
  threatActor: z.string().optional()
});

export type CovertChannel = z.infer<typeof CovertChannelSchema>;

/**
 * TSCM Operations Manager
 */
export class TSCMOperationsManager {
  private sweeps: Map<string, TSCMSweep> = new Map();
  private rfSessions: Map<string, RFMonitoringSession> = new Map();

  /**
   * Schedule TSCM sweep
   */
  scheduleSweep(location: string, date: Date, type: string): TSCMSweep {
    const sweep: TSCMSweep = {
      id: crypto.randomUUID(),
      location,
      scheduledDate: date,
      sweepType: type as any,
      status: 'SCHEDULED',
      team: [],
      areasSwept: [],
      equipmentUsed: [],
      findings: [],
      clearanceStatus: 'CONDITIONAL'
    };

    this.sweeps.set(sweep.id, sweep);
    return sweep;
  }

  /**
   * Record finding during sweep
   */
  recordFinding(sweepId: string, finding: any): boolean {
    const sweep = this.sweeps.get(sweepId);
    if (!sweep) return false;

    sweep.findings.push({
      id: crypto.randomUUID(),
      type: finding.type,
      location: finding.location,
      frequency: finding.frequency,
      description: finding.description,
      threatLevel: finding.threatLevel || 'MEDIUM',
      neutralized: false
    });

    return true;
  }

  /**
   * Complete sweep
   */
  completeSweep(sweepId: string): boolean {
    const sweep = this.sweeps.get(sweepId);
    if (!sweep) return false;

    sweep.status = 'COMPLETED';
    sweep.completedDate = new Date();

    // Determine clearance status
    const criticalFindings = sweep.findings.filter(f => f.threatLevel === 'CRITICAL' && !f.neutralized);
    const highFindings = sweep.findings.filter(f => f.threatLevel === 'HIGH' && !f.neutralized);

    if (criticalFindings.length > 0) {
      sweep.clearanceStatus = 'NOT_CLEAR';
    } else if (highFindings.length > 0) {
      sweep.clearanceStatus = 'CONDITIONAL';
    } else {
      sweep.clearanceStatus = 'CLEAR';
    }

    // Schedule next sweep
    const nextDate = new Date(sweep.completedDate);
    nextDate.setMonth(nextDate.getMonth() + 6); // 6 months from now
    sweep.nextSweepDate = nextDate;

    return true;
  }

  /**
   * Start RF monitoring session
   */
  startRFMonitoring(location: string, freqRange: any): RFMonitoringSession {
    const session: RFMonitoringSession = {
      id: crypto.randomUUID(),
      location,
      startTime: new Date(),
      frequencyRange: freqRange,
      status: 'ACTIVE',
      detections: [],
      baselineEstablished: false,
      anomaliesDetected: 0,
      actionsTaken: []
    };

    this.rfSessions.set(session.id, session);
    return session;
  }

  /**
   * Record RF detection
   */
  recordRFDetection(sessionId: string, detection: any): boolean {
    const session = this.rfSessions.get(sessionId);
    if (!session) return false;

    session.detections.push({
      timestamp: new Date(),
      frequency: detection.frequency,
      signalStrength: detection.signalStrength,
      modulation: detection.modulation,
      duration: detection.duration || 0,
      classification: detection.classification || 'UNKNOWN',
      source: detection.source
    });

    if (detection.classification === 'SUSPICIOUS' || detection.classification === 'HOSTILE') {
      session.anomaliesDetected++;
    }

    return true;
  }

  getSweeps(status?: string): TSCMSweep[] {
    const all = Array.from(this.sweeps.values());
    if (status) {
      return all.filter(s => s.status === status);
    }
    return all;
  }
}

/**
 * TEMPEST Assessor
 */
export class TEMPESTAssessor {
  private assessments: Map<string, TEMPESTAssessment> = new Map();

  conductAssessment(facility: string, equipment: any[]): TEMPESTAssessment {
    const assessment: TEMPESTAssessment = {
      id: crypto.randomUUID(),
      facility,
      assessmentDate: new Date(),
      assessor: 'AUTO_ASSESSOR',
      equipmentTested: equipment,
      emissionsDetected: [],
      vulnerabilities: [],
      recommendations: [],
      complianceStatus: 'COMPLIANT',
      nextAssessment: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    };

    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  recordEmission(assessmentId: string, emission: any): boolean {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) return false;

    assessment.emissionsDetected.push(emission);

    // Update compliance status based on emissions
    const criticalEmissions = assessment.emissionsDetected.filter(e => e.riskLevel === 'CRITICAL');
    if (criticalEmissions.length > 0) {
      assessment.complianceStatus = 'NON_COMPLIANT';
    }

    return true;
  }

  getAssessments(): TEMPESTAssessment[] {
    return Array.from(this.assessments.values());
  }
}

/**
 * Supply Chain Security Manager
 */
export class SupplyChainSecurityManager {
  private assessments: Map<string, SupplyChainSecurity> = new Map();

  assessVendor(vendor: string, component: string): SupplyChainSecurity {
    const assessment: SupplyChainSecurity = {
      id: crypto.randomUUID(),
      vendor,
      component,
      assessmentDate: new Date(),
      riskFactors: [],
      countryOfOrigin: 'UNKNOWN',
      manufacturingLocations: [],
      trustLevel: 'CONDITIONAL',
      inspectionRequired: true,
      alternativeVendors: [],
      approvalStatus: 'PENDING'
    };

    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  approveComponent(assessmentId: string, approved: boolean): boolean {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) return false;

    assessment.approvalStatus = approved ? 'APPROVED' : 'DENIED';
    return true;
  }

  getAssessments(status?: string): SupplyChainSecurity[] {
    const all = Array.from(this.assessments.values());
    if (status) {
      return all.filter(a => a.approvalStatus === status);
    }
    return all;
  }
}

export * from './index.js';
