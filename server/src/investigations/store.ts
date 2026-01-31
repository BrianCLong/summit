import { randomUUID } from 'node:crypto';

import { Case, CaseStatus, EntityRef, Note, Workspace } from './types';

type IdGenerator = () => string;
type Clock = () => Date;

export class InMemoryInvestigationStore {
  private readonly workspaces = new Map<string, Workspace>();
  private readonly cases = new Map<string, Case>();
  private readonly notesByCase = new Map<string, Note[]>();
  private readonly entityRefsByCase = new Map<string, EntityRef[]>();
  private readonly idGenerator: IdGenerator;
  private readonly clock: Clock;

  constructor(options?: { idGenerator?: IdGenerator; clock?: Clock }) {
    this.idGenerator = options?.idGenerator ?? (() => randomUUID());
    this.clock = options?.clock ?? (() => new Date());
  }

  createWorkspace(tenantId: string, name: string): Workspace {
    const workspace: Workspace = {
      id: this.idGenerator(),
      tenant_id: tenantId,
      name,
      created_at: this.clock(),
    };
    this.workspaces.set(workspace.id, workspace);
    return workspace;
  }

  listWorkspaces(tenantId: string): Workspace[] {
    return Array.from(this.workspaces.values())
      .filter((workspace) => workspace.tenant_id === tenantId)
      .sort(this.sortByCreatedAtThenId);
  }

  getWorkspace(tenantId: string, workspaceId: string): Workspace | undefined {
    const workspace = this.workspaces.get(workspaceId);
    if (workspace && workspace.tenant_id !== tenantId) {
      throw new Error('Tenant scope violation for workspace access');
    }
    return workspace;
  }

  createCase(
    tenantId: string,
    workspaceId: string,
    input: { title: string; status?: CaseStatus },
  ): Case {
    const workspace = this.requireWorkspace(tenantId, workspaceId);
    const investigationCase: Case = {
      id: this.idGenerator(),
      workspace_id: workspace.id,
      title: input.title,
      status: input.status ?? 'open',
    };
    this.cases.set(investigationCase.id, investigationCase);
    return investigationCase;
  }

  listCases(tenantId: string, workspaceId: string): Case[] {
    this.requireWorkspace(tenantId, workspaceId);
    return Array.from(this.cases.values())
      .filter((investigationCase) => investigationCase.workspace_id === workspaceId)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  getCase(tenantId: string, caseId: string): Case | undefined {
    const investigationCase = this.cases.get(caseId);
    if (!investigationCase) {
      return undefined;
    }

    this.requireWorkspace(tenantId, investigationCase.workspace_id);
    return investigationCase;
  }

  updateCaseStatus(tenantId: string, caseId: string, status: CaseStatus): Case {
    const investigationCase = this.requireCase(tenantId, caseId);
    const updated: Case = { ...investigationCase, status };
    this.cases.set(caseId, updated);
    return updated;
  }

  addNote(
    tenantId: string,
    caseId: string,
    input: { author_id: string; body: string },
  ): Note {
    const investigationCase = this.requireCase(tenantId, caseId);
    const note: Note = {
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

  listNotes(tenantId: string, caseId: string): Note[] {
    this.requireCase(tenantId, caseId);
    const notes = this.notesByCase.get(caseId) ?? [];
    return [...notes].sort(this.sortByCreatedAtThenId);
  }

  attachEntityRef(tenantId: string, caseId: string, ref: EntityRef): EntityRef {
    this.requireCase(tenantId, caseId);
    const refs = this.entityRefsByCase.get(caseId) ?? [];
    refs.push(ref);
    this.entityRefsByCase.set(caseId, refs);
    return ref;
  }

  listEntityRefs(tenantId: string, caseId: string): EntityRef[] {
    this.requireCase(tenantId, caseId);
    return [...(this.entityRefsByCase.get(caseId) ?? [])];
  }

  private requireWorkspace(tenantId: string, workspaceId: string): Workspace {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }
    if (workspace.tenant_id !== tenantId) {
      throw new Error('Tenant scope violation for workspace access');
    }
    return workspace;
  }

  private requireCase(tenantId: string, caseId: string): Case {
    const investigationCase = this.cases.get(caseId);
    if (!investigationCase) {
      throw new Error(`Case ${caseId} not found`);
    }
    this.requireWorkspace(tenantId, investigationCase.workspace_id);
    return investigationCase;
  }

  private sortByCreatedAtThenId = <T extends { created_at: Date; id: string }>(
    a: T,
    b: T,
  ) => {
    const delta = a.created_at.getTime() - b.created_at.getTime();
    if (delta !== 0) {
      return delta;
    }
    return a.id.localeCompare(b.id);
  };
}
