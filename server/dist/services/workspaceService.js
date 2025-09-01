import { randomUUID } from 'crypto';
const workspaces = new Map();
export function createWorkspace(name) {
    const workspace = {
        id: randomUUID(),
        name,
        members: [],
    };
    workspaces.set(workspace.id, workspace);
    return workspace;
}
export function listWorkspaces() {
    return Array.from(workspaces.values());
}
export function getWorkspace(id) {
    return workspaces.get(id);
}
export function addMember(workspaceId, userId) {
    const workspace = workspaces.get(workspaceId);
    if (workspace && !workspace.members.includes(userId)) {
        workspace.members.push(userId);
    }
    return workspace;
}
//# sourceMappingURL=workspaceService.js.map