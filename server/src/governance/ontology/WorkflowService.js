"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowService = void 0;
const SchemaRegistryService_js_1 = require("./SchemaRegistryService.js");
const crypto_1 = require("crypto");
const persistence_js_1 = require("./persistence.js");
class WorkflowService {
    static instance;
    changeRequests = new Map();
    registry;
    crRepo;
    constructor() {
        this.registry = SchemaRegistryService_js_1.SchemaRegistryService.getInstance();
        this.crRepo = new persistence_js_1.FilePersistenceAdapter('change_requests');
        this.loadFromPersistence();
    }
    static getInstance() {
        if (!WorkflowService.instance) {
            WorkflowService.instance = new WorkflowService();
        }
        return WorkflowService.instance;
    }
    async loadFromPersistence() {
        const crs = await this.crRepo.list();
        crs.forEach(cr => {
            cr.createdAt = new Date(cr.createdAt);
            cr.updatedAt = new Date(cr.updatedAt);
            cr.comments.forEach(c => c.timestamp = new Date(c.timestamp));
            this.changeRequests.set(cr.id, cr);
        });
    }
    async createChangeRequest(title, description, author, proposedChanges) {
        const cr = {
            id: (0, crypto_1.randomUUID)(),
            title,
            description,
            author,
            status: 'OPEN',
            proposedChanges,
            comments: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.changeRequests.set(cr.id, cr);
        await this.crRepo.save(cr.id, cr);
        return cr;
    }
    getChangeRequest(id) {
        return this.changeRequests.get(id);
    }
    listChangeRequests() {
        return Array.from(this.changeRequests.values()).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    async addComment(crId, author, message) {
        const cr = this.changeRequests.get(crId);
        if (!cr)
            throw new Error('Change Request not found');
        cr.comments.push({ author, message, timestamp: new Date() });
        cr.updatedAt = new Date();
        await this.crRepo.save(cr.id, cr);
        return cr;
    }
    async reviewChangeRequest(id, reviewer, decision, comment) {
        const cr = this.changeRequests.get(id);
        if (!cr)
            throw new Error('Change Request not found');
        if (comment) {
            await this.addComment(id, reviewer, `[${decision}] ${comment}`);
        }
        if (decision === 'APPROVED') {
            cr.status = 'APPROVED';
        }
        else {
            cr.status = 'REJECTED';
        }
        cr.updatedAt = new Date();
        await this.crRepo.save(cr.id, cr);
        return cr;
    }
    async mergeChangeRequest(id, merger) {
        const cr = this.changeRequests.get(id);
        if (!cr)
            throw new Error('Change Request not found');
        if (cr.status !== 'APPROVED')
            throw new Error('Change Request must be APPROVED to merge');
        // 1. Get current active schema
        const currentSchema = this.registry.getLatestSchema();
        if (!currentSchema)
            throw new Error('No active schema to base changes on');
        // 2. Clone definition
        const newDefinition = JSON.parse(JSON.stringify(currentSchema.definition));
        // 3. Apply changes
        for (const change of cr.proposedChanges) {
            await this.applyChange(newDefinition, change);
        }
        // 4. Register new schema
        const newVersion = await this.registry.registerSchema(newDefinition, `Merged CR: ${cr.title}`, merger);
        // 5. Activate new schema
        await this.registry.activateSchema(newVersion.id, merger);
        // 6. Update CR status
        cr.status = 'MERGED';
        cr.updatedAt = new Date();
        await this.crRepo.save(cr.id, cr);
        return newVersion;
    }
    async applyChange(definition, change) {
        switch (change.type) {
            case 'ADD_ENTITY':
                // Check for duplicate name
                if (definition.entities.find(e => e.name === change.payload.name)) {
                    throw new Error(`Entity ${change.payload.name} already exists`);
                }
                definition.entities.push(change.payload);
                break;
            case 'MODIFY_ENTITY':
                const entityIdx = definition.entities.findIndex(e => e.name === change.targetId);
                if (entityIdx !== -1) {
                    definition.entities[entityIdx] = { ...definition.entities[entityIdx], ...change.payload };
                }
                else {
                    throw new Error(`Entity ${change.targetId} not found`);
                }
                break;
            case 'DEPRECATE_ENTITY':
                // In this simplified model, we might just rename or tag it.
                // Real deprecation might involve 'deprecated' flag on EntityDefinition.
                // For now, let's assume payload contains { deprecated: true } and use MODIFY logic
                // or strict removal if that's the intent (though schemas usually grow only).
                // Let's assume DEPRECATE adds a constraint "DEPRECATED".
                const depEntity = definition.entities.find(e => e.name === change.targetId);
                if (depEntity) {
                    depEntity.constraints.push('DEPRECATED');
                }
                break;
            case 'ADD_FIELD':
                // targetId is Entity Name
                const targetEntity = definition.entities.find(e => e.name === change.targetId);
                if (!targetEntity)
                    throw new Error(`Entity ${change.targetId} not found`);
                if (targetEntity.fields.find(f => f.name === change.payload.name)) {
                    throw new Error(`Field ${change.payload.name} already exists on ${change.targetId}`);
                }
                targetEntity.fields.push(change.payload);
                break;
            case 'MODIFY_FIELD':
                // targetId is "EntityName.FieldName"
                const [entName, fieldName] = change.targetId.split('.');
                const modEntity = definition.entities.find(e => e.name === entName);
                if (!modEntity)
                    throw new Error(`Entity ${entName} not found`);
                const fieldIdx = modEntity.fields.findIndex(f => f.name === fieldName);
                if (fieldIdx === -1)
                    throw new Error(`Field ${fieldName} not found on ${entName}`);
                modEntity.fields[fieldIdx] = { ...modEntity.fields[fieldIdx], ...change.payload };
                break;
            case 'ADD_VOCAB':
                await this.registry.createVocabulary(change.payload.name, change.payload.description, change.payload.concepts);
                break;
            case 'MODIFY_VOCAB':
                // Assume payload contains new concept
                if (change.payload.newConcept) {
                    await this.registry.addConceptToVocabulary(change.targetId, change.payload.newConcept);
                }
                break;
            default:
                console.warn(`Unknown change type: ${change.type}`);
        }
    }
    calculateImpact(crId) {
        const cr = this.changeRequests.get(crId);
        if (!cr)
            return {};
        const impact = {
            affectedServices: [],
            affectedDatasets: [],
            breakingChanges: false
        };
        // Naive analysis
        for (const change of cr.proposedChanges) {
            if (change.type.includes('MODIFY') || change.type.includes('DEPRECATE')) {
                impact.affectedServices.push('all-consumers');
                impact.breakingChanges = true;
            }
            if (change.type === 'ADD_FIELD') {
                impact.affectedServices.push('ingest-service');
            }
        }
        return impact;
    }
}
exports.WorkflowService = WorkflowService;
