"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryInvestigationStore = void 0;
const node_crypto_1 = require("node:crypto");
class InMemoryInvestigationStore {
    workspaces = new Map();
    cases = new Map();
    notesByCase = new Map();
    entityRefsByCase = new Map();
    idGenerator;
    clock;
    constructor(options) {
        this.idGenerator = options?.idGenerator ?? (() => (0, node_crypto_1.randomUUID)());
        this.clock = options?.clock ?? (() => new Date());
    }
    createWorkspace(tenantId, name) {
        const workspace = {
            id: this.idGenerator(),
            tenant_id: tenantId,
            name,
            created_at: this.clock(),
        };
        this.workspaces.set(workspace.id, workspace);
        return workspace;
    }
    listWorkspaces(tenantId) {
        return Array.from(this.workspaces.values())
            .filter((workspace) => workspace.tenant_id === tenantId)
            .sort(this.sortByCreatedAtThenId);
    }
    getWorkspace(tenantId, workspaceId) {
        const workspace = this.workspaces.get(workspaceId);
        if (workspace && workspace.tenant_id !== tenantId) {
            throw new Error('Tenant scope violation for workspace access');
        }
        return workspace;
    }
    createCase(tenantId, workspaceId, input) {
        const workspace = this.requireWorkspace(tenantId, workspaceId);
        const investigationCase = {
            id: this.idGenerator(),
            workspace_id: workspace.id,
            title: input.title,
            status: input.status ?? 'open',
        };
        this.cases.set(investigationCase.id, investigationCase);
        return investigationCase;
    }
    listCases(tenantId, workspaceId) {
        this.requireWorkspace(tenantId, workspaceId);
        return Array.from(this.cases.values())
            .filter((investigationCase) => investigationCase.workspace_id === workspaceId)
            .sort((a, b) => a.id.localeCompare(b.id));
    }
    getCase(tenantId, caseId) {
        const investigationCase = this.cases.get(caseId);
        if (!investigationCase) {
            return undefined;
        }
        this.requireWorkspace(tenantId, investigationCase.workspace_id);
        return investigationCase;
    }
    updateCaseStatus(tenantId, caseId, status) {
        const investigationCase = this.requireCase(tenantId, caseId);
        const updated = { ...investigationCase, status };
        this.cases.set(caseId, updated);
        return updated;
    }
    addNote(tenantId, caseId, input) {
        const investigationCase = this.requireCase(tenantId, caseId);
        const note = {
            id: this.idGenerator(),
            case_id: investigationCase.id,
            author_id: input.author_id,
            body: input.body,
            created_at: this.clock(),
        };
        const notes = this.notesByCase.get(caseId) ?? [];
        notes.push(note);
        this.notesByCase.set(caseId, notes);
        return note;
    }
    listNotes(tenantId, caseId) {
        this.requireCase(tenantId, caseId);
        const notes = this.notesByCase.get(caseId) ?? [];
        return [...notes].sort(this.sortByCreatedAtThenId);
    }
    attachEntityRef(tenantId, caseId, ref) {
        this.requireCase(tenantId, caseId);
        const refs = this.entityRefsByCase.get(caseId) ?? [];
        refs.push(ref);
        this.entityRefsByCase.set(caseId, refs);
        return ref;
    }
    listEntityRefs(tenantId, caseId) {
        this.requireCase(tenantId, caseId);
        return [...(this.entityRefsByCase.get(caseId) ?? [])];
    }
    requireWorkspace(tenantId, workspaceId) {
        const workspace = this.workspaces.get(workspaceId);
        if (!workspace) {
            throw new Error(`Workspace ${workspaceId} not found`);
        }
        if (workspace.tenant_id !== tenantId) {
            throw new Error('Tenant scope violation for workspace access');
        }
        return workspace;
    }
    requireCase(tenantId, caseId) {
        const investigationCase = this.cases.get(caseId);
        if (!investigationCase) {
            throw new Error(`Case ${caseId} not found`);
        }
        this.requireWorkspace(tenantId, investigationCase.workspace_id);
        return investigationCase;
    }
    sortByCreatedAtThenId = (a, b) => {
        const delta = a.created_at.getTime() - b.created_at.getTime();
        if (delta !== 0) {
            return delta;
        }
        return a.id.localeCompare(b.id);
    };
}
exports.InMemoryInvestigationStore = InMemoryInvestigationStore;
