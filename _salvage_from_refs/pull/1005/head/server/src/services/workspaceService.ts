import { randomUUID } from 'crypto';

export interface Workspace {
  id: string;
  name: string;
  members: string[];
}

const workspaces = new Map<string, Workspace>();

export function createWorkspace(name: string): Workspace {
  const workspace: Workspace = {
    id: randomUUID(),
    name,
    members: [],
  };
  workspaces.set(workspace.id, workspace);
  return workspace;
}

export function listWorkspaces(): Workspace[] {
  return Array.from(workspaces.values());
}

export function getWorkspace(id: string): Workspace | undefined {
  return workspaces.get(id);
}

export function addMember(workspaceId: string, userId: string): Workspace | undefined {
  const workspace = workspaces.get(workspaceId);
  if (workspace && !workspace.members.includes(userId)) {
    workspace.members.push(userId);
  }
  return workspace;
}
