import { EventEmitter } from 'events';
import { cacheService } from './cacheService';
export class InvestigationWorkflowService extends EventEmitter {
    investigations = new Map();
    templates = new Map();
    constructor() {
        super();
        console.log('[WORKFLOW] Investigation workflow service initialized');
        this.initializeTemplates();
    }
    initializeTemplates() {
        // Security Incident Template
        const securityIncidentTemplate = {
            id: 'template-security-incident',
            name: 'Security Incident Investigation',
            description: 'Standard template for security incident investigations',
            category: 'Security',
            workflowStages: [
                'INTAKE',
                'TRIAGE',
                'INVESTIGATION',
                'CONTAINMENT',
                'ERADICATION',
                'RECOVERY',
                'LESSONS_LEARNED',
            ],
            requiredFields: ['title', 'description', 'priority', 'assignedTo'],
            defaultTags: ['security', 'incident'],
            defaultClassification: 'CONFIDENTIAL',
            estimatedDuration: 48,
            slaHours: 72,
        };
        // Malware Analysis Template
        const malwareAnalysisTemplate = {
            id: 'template-malware-analysis',
            name: 'Malware Analysis Investigation',
            description: 'Template for malware analysis and reverse engineering',
            category: 'Malware',
            workflowStages: [
                'INTAKE',
                'TRIAGE',
                'INVESTIGATION',
                'ANALYSIS',
                'CONTAINMENT',
                'LESSONS_LEARNED',
            ],
            requiredFields: ['title', 'description', 'priority'],
            defaultTags: ['malware', 'analysis', 'reverse-engineering'],
            defaultClassification: 'SECRET',
            estimatedDuration: 96,
            slaHours: 120,
        };
        // Fraud Investigation Template
        const fraudInvestigationTemplate = {
            id: 'template-fraud-investigation',
            name: 'Fraud Investigation',
            description: 'Template for financial fraud investigations',
            category: 'Fraud',
            workflowStages: [
                'INTAKE',
                'TRIAGE',
                'INVESTIGATION',
                'ANALYSIS',
                'RECOVERY',
                'LESSONS_LEARNED',
            ],
            requiredFields: ['title', 'description', 'priority', 'assignedTo'],
            defaultTags: ['fraud', 'financial'],
            defaultClassification: 'CONFIDENTIAL',
            estimatedDuration: 72,
            slaHours: 96,
        };
        this.templates.set(securityIncidentTemplate.id, securityIncidentTemplate);
        this.templates.set(malwareAnalysisTemplate.id, malwareAnalysisTemplate);
        this.templates.set(fraudInvestigationTemplate.id, fraudInvestigationTemplate);
        console.log(`[WORKFLOW] Initialized ${this.templates.size} investigation templates`);
    }
    /**
     * Create a new investigation from template
     */
    async createInvestigation(templateId, data) {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }
        const investigationId = `inv-${Date.now()}`;
        const now = new Date().toISOString();
        // Initialize workflow stages
        const workflow = {
            currentStage: 'INTAKE',
            stages: {},
        };
        template.workflowStages.forEach((stage) => {
            workflow.stages[stage] = {
                status: stage === 'INTAKE' ? 'IN_PROGRESS' : 'PENDING',
                startedAt: stage === 'INTAKE' ? now : undefined,
                assignedTo: data.assignedTo[0],
                notes: '',
                requirements: this.getStageRequirements(stage),
                artifacts: [],
            };
        });
        const investigation = {
            id: investigationId,
            name: data.name,
            description: data.description,
            status: 'ACTIVE',
            priority: data.priority,
            assignedTo: data.assignedTo,
            createdBy: data.createdBy,
            createdAt: now,
            updatedAt: now,
            dueDate: data.dueDate,
            tags: [...template.defaultTags, ...(data.tags || [])],
            classification: data.classification || template.defaultClassification,
            workflow,
            entities: [],
            relationships: [],
            evidence: [],
            findings: [],
            timeline: [],
            collaborators: data.assignedTo,
            permissions: data.assignedTo.map((userId) => ({
                userId,
                role: 'ANALYST',
                permissions: ['read', 'write', 'manage_evidence'],
                grantedBy: data.createdBy,
                grantedAt: now,
            })),
        };
        this.investigations.set(investigationId, investigation);
        await cacheService.set(`investigation:${investigationId}`, investigation, 3600);
        this.emit('investigationCreated', investigation);
        console.log(`[WORKFLOW] Created investigation: ${investigationId} from template: ${templateId}`);
        return investigation;
    }
    /**
     * Update investigation workflow stage
     */
    async advanceWorkflowStage(investigationId, userId, notes) {
        const investigation = this.investigations.get(investigationId);
        if (!investigation) {
            throw new Error(`Investigation not found: ${investigationId}`);
        }
        const currentStage = investigation.workflow.currentStage;
        const stageOrder = [
            'INTAKE',
            'TRIAGE',
            'INVESTIGATION',
            'ANALYSIS',
            'CONTAINMENT',
            'ERADICATION',
            'RECOVERY',
            'LESSONS_LEARNED',
        ];
        const currentIndex = stageOrder.indexOf(currentStage);
        if (currentIndex === -1 || currentIndex === stageOrder.length - 1) {
            throw new Error('Cannot advance workflow from current stage');
        }
        const now = new Date().toISOString();
        const nextStage = stageOrder[currentIndex + 1];
        // Complete current stage
        investigation.workflow.stages[currentStage] = {
            ...investigation.workflow.stages[currentStage],
            status: 'COMPLETED',
            completedAt: now,
            notes,
        };
        // Start next stage
        investigation.workflow.stages[nextStage] = {
            ...investigation.workflow.stages[nextStage],
            status: 'IN_PROGRESS',
            startedAt: now,
            assignedTo: investigation.assignedTo[0],
        };
        investigation.workflow.currentStage = nextStage;
        investigation.updatedAt = now;
        await cacheService.set(`investigation:${investigationId}`, investigation, 3600);
        this.emit('workflowAdvanced', {
            investigation,
            previousStage: currentStage,
            newStage: nextStage,
            userId,
        });
        console.log(`[WORKFLOW] Advanced investigation ${investigationId} from ${currentStage} to ${nextStage}`);
        return investigation;
    }
    /**
     * Add evidence to investigation
     */
    async addEvidence(investigationId, evidence, collectedBy) {
        const investigation = this.investigations.get(investigationId);
        if (!investigation) {
            throw new Error(`Investigation not found: ${investigationId}`);
        }
        const evidenceId = `evidence-${Date.now()}`;
        const now = new Date().toISOString();
        const newEvidence = {
            ...evidence,
            id: evidenceId,
            collectedAt: now,
            collectedBy,
            chainOfCustody: [
                {
                    timestamp: now,
                    custodian: collectedBy,
                    action: 'COLLECTED',
                    location: 'Digital Collection',
                    integrity: 'VERIFIED',
                },
            ],
        };
        investigation.evidence.push(newEvidence);
        investigation.updatedAt = now;
        await cacheService.set(`investigation:${investigationId}`, investigation, 3600);
        this.emit('evidenceAdded', { investigation, evidence: newEvidence });
        console.log(`[WORKFLOW] Added evidence ${evidenceId} to investigation ${investigationId}`);
        return investigation;
    }
    /**
     * Add finding to investigation
     */
    async addFinding(investigationId, finding, discoveredBy) {
        const investigation = this.investigations.get(investigationId);
        if (!investigation) {
            throw new Error(`Investigation not found: ${investigationId}`);
        }
        const findingId = `finding-${Date.now()}`;
        const now = new Date().toISOString();
        const newFinding = {
            ...finding,
            id: findingId,
            discoveredAt: now,
            discoveredBy,
        };
        investigation.findings.push(newFinding);
        investigation.updatedAt = now;
        await cacheService.set(`investigation:${investigationId}`, investigation, 3600);
        this.emit('findingAdded', { investigation, finding: newFinding });
        console.log(`[WORKFLOW] Added finding ${findingId} to investigation ${investigationId}`);
        return investigation;
    }
    /**
     * Add timeline entry to investigation
     */
    async addTimelineEntry(investigationId, entry) {
        const investigation = this.investigations.get(investigationId);
        if (!investigation) {
            throw new Error(`Investigation not found: ${investigationId}`);
        }
        const entryId = `timeline-${Date.now()}`;
        const newEntry = {
            ...entry,
            id: entryId,
        };
        investigation.timeline.push(newEntry);
        investigation.timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        investigation.updatedAt = new Date().toISOString();
        await cacheService.set(`investigation:${investigationId}`, investigation, 3600);
        this.emit('timelineEntryAdded', { investigation, entry: newEntry });
        console.log(`[WORKFLOW] Added timeline entry ${entryId} to investigation ${investigationId}`);
        return investigation;
    }
    /**
     * Get investigation by ID
     */
    async getInvestigation(investigationId) {
        let investigation = this.investigations.get(investigationId);
        if (!investigation) {
            // Try to load from cache
            investigation = await cacheService.get(`investigation:${investigationId}`);
            if (investigation) {
                this.investigations.set(investigationId, investigation);
            }
        }
        return investigation || null;
    }
    /**
     * Get all investigations
     */
    getAllInvestigations() {
        return Array.from(this.investigations.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    /**
     * Get investigations by status
     */
    getInvestigationsByStatus(status) {
        return Array.from(this.investigations.values())
            .filter((inv) => inv.status === status)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    /**
     * Get investigations assigned to user
     */
    getAssignedInvestigations(userId) {
        return Array.from(this.investigations.values())
            .filter((inv) => inv.assignedTo.includes(userId))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    /**
     * Get available templates
     */
    getTemplates() {
        return Array.from(this.templates.values());
    }
    /**
     * Get workflow statistics
     */
    getWorkflowStatistics() {
        const investigations = Array.from(this.investigations.values());
        return {
            total: investigations.length,
            byStatus: investigations.reduce((acc, inv) => {
                acc[inv.status] = (acc[inv.status] || 0) + 1;
                return acc;
            }, {}),
            byPriority: investigations.reduce((acc, inv) => {
                acc[inv.priority] = (acc[inv.priority] || 0) + 1;
                return acc;
            }, {}),
            byStage: investigations.reduce((acc, inv) => {
                acc[inv.workflow.currentStage] =
                    (acc[inv.workflow.currentStage] || 0) + 1;
                return acc;
            }, {}),
            overdueSLA: investigations.filter((inv) => {
                if (!inv.dueDate)
                    return false;
                return new Date() > new Date(inv.dueDate);
            }).length,
        };
    }
    getStageRequirements(stage) {
        const requirements = {
            INTAKE: [
                'Initial report documented',
                'Priority assigned',
                'Analyst assigned',
            ],
            TRIAGE: [
                'Threat assessment completed',
                'Scope determined',
                'Resources allocated',
            ],
            INVESTIGATION: [
                'Evidence collected',
                'Entities identified',
                'Timeline constructed',
            ],
            ANALYSIS: [
                'Root cause identified',
                'Attack vectors mapped',
                'Impact assessed',
            ],
            CONTAINMENT: ['Threat contained', 'Systems isolated', 'Damage minimized'],
            ERADICATION: [
                'Threat removed',
                'Vulnerabilities patched',
                'Systems hardened',
            ],
            RECOVERY: [
                'Systems restored',
                'Operations normalized',
                'Monitoring enhanced',
            ],
            LESSONS_LEARNED: [
                'Report documented',
                'Improvements identified',
                'Training updated',
            ],
        };
        return requirements[stage] || [];
    }
}
// Global investigation workflow service instance
export const investigationWorkflowService = new InvestigationWorkflowService();
//# sourceMappingURL=investigationWorkflowService.js.map