"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryStores = void 0;
/**
 * In-memory implementation of stores for demo purposes
 * In production, these would be backed by a database
 */
class InMemoryStores {
    // Workspace data
    workspaces = new Map();
    members = new Map();
    projects = new Map();
    projectMembers = new Map();
    invitations = new Map();
    workspaceActivities = new Map();
    // Sync data
    documentStates = new Map();
    operations = new Map();
    sessions = new Map();
    presence = new Map();
    locks = new Map();
    // Comment data
    threads = new Map();
    comments = new Map();
    reactions = new Map();
    votes = new Map();
    annotations = new Map();
    layers = new Map();
    commentNotifications = new Map();
    // Version control data
    repositories = new Map();
    branches = new Map();
    commits = new Map();
    tags = new Map();
    content = new Map();
    // Collaboration data
    documents = new Map();
    tasks = new Map();
    boards = new Map();
    notifications = new Map();
    activities = new Map();
    shareLinks = new Map();
    marketplaceAssets = new Map();
    meetings = new Map();
    // Workspace store implementation
    workspace = {
        createWorkspace: async (workspace) => {
            const id = Math.random().toString(36).substring(7);
            const newWorkspace = {
                ...workspace,
                id,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            this.workspaces.set(id, newWorkspace);
            return newWorkspace;
        },
        getWorkspace: async (id) => this.workspaces.get(id) || null,
        getWorkspaceBySlug: async (slug) => {
            for (const ws of this.workspaces.values()) {
                if (ws.slug === slug)
                    return ws;
            }
            return null;
        },
        updateWorkspace: async (id, updates) => {
            const workspace = this.workspaces.get(id);
            if (!workspace)
                throw new Error('Workspace not found');
            const updated = { ...workspace, ...updates, updatedAt: new Date() };
            this.workspaces.set(id, updated);
            return updated;
        },
        deleteWorkspace: async (id) => {
            this.workspaces.delete(id);
        },
        listWorkspaces: async (userId) => {
            return Array.from(this.workspaces.values());
        },
        addMember: async (member) => {
            const id = Math.random().toString(36).substring(7);
            const newMember = { ...member, id, joinedAt: new Date() };
            const members = this.members.get(member.workspaceId) || [];
            members.push(newMember);
            this.members.set(member.workspaceId, members);
            return newMember;
        },
        getMember: async (workspaceId, userId) => {
            const members = this.members.get(workspaceId) || [];
            return members.find(m => m.userId === userId) || null;
        },
        updateMemberRole: async (workspaceId, userId, role) => {
            const members = this.members.get(workspaceId) || [];
            const member = members.find(m => m.userId === userId);
            if (!member)
                throw new Error('Member not found');
            member.role = role;
            return member;
        },
        removeMember: async (workspaceId, userId) => {
            const members = this.members.get(workspaceId) || [];
            this.members.set(workspaceId, members.filter(m => m.userId !== userId));
        },
        listMembers: async (workspaceId) => {
            return this.members.get(workspaceId) || [];
        },
        createProject: async (project) => {
            const id = Math.random().toString(36).substring(7);
            const newProject = {
                ...project,
                id,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            this.projects.set(id, newProject);
            return newProject;
        },
        getProject: async (id) => this.projects.get(id) || null,
        updateProject: async (id, updates) => {
            const project = this.projects.get(id);
            if (!project)
                throw new Error('Project not found');
            const updated = { ...project, ...updates, updatedAt: new Date() };
            this.projects.set(id, updated);
            return updated;
        },
        deleteProject: async (id) => {
            this.projects.delete(id);
        },
        listProjects: async (workspaceId) => {
            return Array.from(this.projects.values()).filter(p => p.workspaceId === workspaceId);
        },
        addProjectMember: async (member) => {
            const id = Math.random().toString(36).substring(7);
            const newMember = { ...member, id, addedAt: new Date() };
            const members = this.projectMembers.get(member.projectId) || [];
            members.push(newMember);
            this.projectMembers.set(member.projectId, members);
            return newMember;
        },
        removeProjectMember: async (projectId, userId) => {
            const members = this.projectMembers.get(projectId) || [];
            this.projectMembers.set(projectId, members.filter(m => m.userId !== userId));
        },
        listProjectMembers: async (projectId) => {
            return this.projectMembers.get(projectId) || [];
        },
        createInvitation: async (invitation) => {
            const id = Math.random().toString(36).substring(7);
            const token = Math.random().toString(36).substring(2);
            const newInvitation = {
                ...invitation,
                id,
                token,
                createdAt: new Date()
            };
            this.invitations.set(token, newInvitation);
            return newInvitation;
        },
        getInvitation: async (token) => this.invitations.get(token) || null,
        acceptInvitation: async (token, userId) => {
            const invitation = this.invitations.get(token);
            if (!invitation)
                throw new Error('Invitation not found');
            return this.workspace.addMember({
                workspaceId: invitation.workspaceId,
                userId,
                role: invitation.role,
                permissions: []
            });
        },
        listInvitations: async (workspaceId) => {
            return Array.from(this.invitations.values()).filter(i => i.workspaceId === workspaceId);
        },
        logActivity: async (activity) => {
            const id = Math.random().toString(36).substring(7);
            const newActivity = { ...activity, id, createdAt: new Date() };
            const activities = this.workspaceActivities.get(activity.workspaceId) || [];
            activities.unshift(newActivity);
            this.workspaceActivities.set(activity.workspaceId, activities);
            return newActivity;
        },
        getActivities: async (workspaceId, limit) => {
            const activities = this.workspaceActivities.get(workspaceId) || [];
            return limit ? activities.slice(0, limit) : activities;
        }
    };
    // Simplified implementations for other stores
    sync = {
        getDocumentState: async (documentId) => this.documentStates.get(documentId) || null,
        saveDocumentState: async (state) => {
            this.documentStates.set(state.id, state);
        },
        appendOperation: async (documentId, operation) => {
            const ops = this.operations.get(documentId) || [];
            ops.push(operation);
            this.operations.set(documentId, ops);
        },
        getOperations: async (documentId, fromVersion) => {
            const ops = this.operations.get(documentId) || [];
            return ops.filter(op => op.version >= fromVersion);
        },
        createSession: async (session) => {
            this.sessions.set(session.id, session);
        },
        getSession: async (sessionId) => this.sessions.get(sessionId) || null,
        updateSession: async (sessionId, updates) => {
            const session = this.sessions.get(sessionId);
            if (!session)
                throw new Error('Session not found');
            const updated = { ...session, ...updates };
            this.sessions.set(sessionId, updated);
        },
        deleteSession: async (sessionId) => {
            this.sessions.delete(sessionId);
        },
        getActiveSessions: async (documentId) => {
            return Array.from(this.sessions.values()).filter(s => s.documentId === documentId);
        },
        updatePresence: async (presence) => {
            const presenceList = this.presence.get(presence.documentId) || [];
            const index = presenceList.findIndex(p => p.userId === presence.userId);
            if (index >= 0) {
                presenceList[index] = presence;
            }
            else {
                presenceList.push(presence);
            }
            this.presence.set(presence.documentId, presenceList);
        },
        getPresence: async (documentId) => this.presence.get(documentId) || [],
        removePresence: async (userId, documentId) => {
            const presenceList = this.presence.get(documentId) || [];
            this.presence.set(documentId, presenceList.filter(p => p.userId !== userId));
        },
        acquireLock: async (lock) => {
            const existingLock = this.locks.get(lock.documentId);
            if (existingLock && existingLock.expiresAt > new Date()) {
                return false;
            }
            this.locks.set(lock.documentId, lock);
            return true;
        },
        releaseLock: async (documentId, userId) => {
            this.locks.delete(documentId);
        },
        getLock: async (documentId) => this.locks.get(documentId) || null
    };
    // Additional store implementations would follow similar patterns
    comment = {}; // Simplified for brevity
    versionControl = {}; // Simplified for brevity
    document = {}; // Simplified for brevity
    task = {}; // Simplified for brevity
    notification = {}; // Simplified for brevity
    activity = {}; // Simplified for brevity
    sharing = {}; // Simplified for brevity
    marketplace = {}; // Simplified for brevity
    meeting = {}; // Simplified for brevity
}
exports.InMemoryStores = InMemoryStores;
