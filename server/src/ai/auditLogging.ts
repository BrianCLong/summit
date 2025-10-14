/**
 * Comprehensive audit logging for AI operations
 */
import { v4 as uuid } from "uuid";

let auditRepo: any = null;

export function setupAIAuditLogging(db: any) {
  auditRepo = db.audit;
  console.log('AI audit logging initialized');
}

// Audit different types of AI operations
export async function auditAIOperation(type: string, actorId: string, meta: any = {}) {
  if (!auditRepo) return;
  
  try {
    await auditRepo.insert({
      id: uuid(),
      type,
      actorId,
      createdAt: new Date().toISOString(),
      meta: {
        ...meta,
        timestamp: Date.now(),
        service: 'intelgraph-ai'
      }
    });
  } catch (error) {
    console.error('Failed to audit AI operation:', error);
  }
}

// Specific audit functions for common operations
export async function auditJobCreation(jobId: string, kind: string, userId: string, metadata: any = {}) {
  await auditAIOperation('AI_JOB_CREATED', userId, {
    jobId,
    kind,
    ...metadata
  });
}

export async function auditJobCompletion(jobId: string, kind: string, status: string, processingTime: number, metadata: any = {}) {
  await auditAIOperation('AI_JOB_COMPLETED', 'ml-service', {
    jobId,
    kind,
    status,
    processingTimeMs: processingTime,
    ...metadata
  });
}

export async function auditInsightDecision(insightId: string, decision: string, userId: string, reason?: string) {
  await auditAIOperation('AI_INSIGHT_DECISION', userId, {
    insightId,
    decision,
    reason,
    timestamp: Date.now()
  });
}

export async function auditMLModelUsage(modelName: string, taskType: string, userId: string, performanceMetrics: any = {}) {
  await auditAIOperation('AI_MODEL_USAGE', userId, {
    modelName,
    taskType,
    performanceMetrics,
    timestamp: Date.now()
  });
}

export async function auditSecurityEvent(eventType: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
  await auditAIOperation('AI_SECURITY_EVENT', 'system', {
    eventType,
    severity,
    details,
    timestamp: Date.now()
  });
}

export async function auditDataAccess(dataType: string, operation: string, userId: string, recordCount: number, details: any = {}) {
  await auditAIOperation('AI_DATA_ACCESS', userId, {
    dataType,
    operation,
    recordCount,
    details,
    timestamp: Date.now()
  });
}

export async function auditWebhookReceived(jobId: string, kind: string, signature: string, ipAddress?: string) {
  await auditAIOperation('AI_WEBHOOK_RECEIVED', 'ml-service', {
    jobId,
    kind,
    signaturePresent: !!signature,
    signatureValid: true, // This would be set by the webhook handler
    ipAddress,
    timestamp: Date.now()
  });
}

export async function auditConfigurationChange(configType: string, userId: string, oldValue: any, newValue: any) {
  await auditAIOperation('AI_CONFIG_CHANGE', userId, {
    configType,
    oldValue,
    newValue,
    timestamp: Date.now()
  });
}

// Get audit trail for specific entities
export async function getAuditTrail(entityType: string, entityId: string, limit: number = 100) {
  if (!auditRepo) return [];
  
  try {
    return await auditRepo.findByType(`AI_${entityType.toUpperCase()}_%`, limit);
  } catch (error) {
    console.error('Failed to get audit trail:', error);
    return [];
  }
}

// Get recent security events
export async function getRecentSecurityEvents(hours: number = 24) {
  if (!auditRepo) return [];
  
  try {
    const events = await auditRepo.findRecent(hours);
    return events.filter((event: any) => event.type === 'AI_SECURITY_EVENT');
  } catch (error) {
    console.error('Failed to get recent security events:', error);
    return [];
  }
}

// Generate audit reports
export async function generateAuditReport(startDate: string, endDate: string) {
  if (!auditRepo) return null;
  
  try {
    const events = await auditRepo.findRecent(24 * 7); // Last week
    
    const report = {
      period: { startDate, endDate },
      summary: {
        totalEvents: events.length,
        jobsCreated: events.filter((e: any) => e.type === 'AI_JOB_CREATED').length,
        jobsCompleted: events.filter((e: any) => e.type === 'AI_JOB_COMPLETED').length,
        insightDecisions: events.filter((e: any) => e.type === 'AI_INSIGHT_DECISION').length,
        securityEvents: events.filter((e: any) => e.type === 'AI_SECURITY_EVENT').length,
      },
      topUsers: getTopActors(events),
      securitySummary: getSecuritySummary(events),
      performanceMetrics: getPerformanceMetrics(events)
    };
    
    return report;
  } catch (error) {
    console.error('Failed to generate audit report:', error);
    return null;
  }
}

function getTopActors(events: any[]) {
  const actorCounts: { [key: string]: number } = {};
  
  events.forEach(event => {
    if (event.actor_id && event.actor_id !== 'system' && event.actor_id !== 'ml-service') {
      actorCounts[event.actor_id] = (actorCounts[event.actor_id] || 0) + 1;
    }
  });
  
  return Object.entries(actorCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([actorId, count]) => ({ actorId, eventCount: count }));
}

function getSecuritySummary(events: any[]) {
  const securityEvents = events.filter(e => e.type === 'AI_SECURITY_EVENT');
  const severityCounts: { [key: string]: number } = {};
  
  securityEvents.forEach(event => {
    const severity = event.meta?.severity || 'unknown';
    severityCounts[severity] = (severityCounts[severity] || 0) + 1;
  });
  
  return {
    totalSecurityEvents: securityEvents.length,
    severityBreakdown: severityCounts,
    recentCritical: securityEvents.filter(e => e.meta?.severity === 'critical').length
  };
}

function getPerformanceMetrics(events: any[]) {
  const jobCompletions = events.filter(e => e.type === 'AI_JOB_COMPLETED' && e.meta?.processingTimeMs);
  
  if (jobCompletions.length === 0) {
    return { averageProcessingTime: null, totalJobs: 0 };
  }
  
  const processingTimes = jobCompletions.map(e => e.meta.processingTimeMs);
  const average = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
  
  return {
    averageProcessingTime: Math.round(average),
    totalJobs: jobCompletions.length,
    fastestJob: Math.min(...processingTimes),
    slowestJob: Math.max(...processingTimes)
  };
}