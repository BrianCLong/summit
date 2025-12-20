import { CollaborationStores } from '@intelgraph/collaboration';
import type {
  Workspace,
  WorkspaceMember,
  Project,
  ProjectMember,
  WorkspaceInvitation,
  WorkspaceActivity,
  Operation,
  DocumentState,
  Presence,
  SyncSession,
  DocumentLock,
  CommentThread,
  Comment,
  CommentReaction,
  Annotation,
  AnnotationLayer,
  CommentVote,
  CommentNotification,
  Repository,
  Branch,
  Commit,
  Tag,
  Document,
  Task,
  Board,
  Notification,
  ActivityFeedItem,
  ShareLink,
  MarketplaceAsset,
  Meeting,
  CommentFilter,
  CommentSearchResult
} from '@intelgraph/collaboration';

/**
 * In-memory implementation of stores for demo purposes
 * In production, these would be backed by a database
 */
export class InMemoryStores implements CollaborationStores {
  // Workspace data
  private workspaces = new Map<string, Workspace>();
  private members = new Map<string, WorkspaceMember[]>();
  private projects = new Map<string, Project>();
  private projectMembers = new Map<string, ProjectMember[]>();
  private invitations = new Map<string, WorkspaceInvitation>();
  private workspaceActivities = new Map<string, WorkspaceActivity[]>();

  // Sync data
  private documentStates = new Map<string, DocumentState>();
  private operations = new Map<string, Operation[]>();
  private sessions = new Map<string, SyncSession>();
  private presence = new Map<string, Presence[]>();
  private locks = new Map<string, DocumentLock>();

  // Comment data
  private threads = new Map<string, CommentThread>();
  private comments = new Map<string, Comment[]>();
  private reactions = new Map<string, CommentReaction[]>();
  private votes = new Map<string, CommentVote[]>();
  private annotations = new Map<string, Annotation>();
  private layers = new Map<string, AnnotationLayer>();
  private commentNotifications = new Map<string, CommentNotification[]>();

  // Version control data
  private repositories = new Map<string, Repository>();
  private branches = new Map<string, Branch>();
  private commits = new Map<string, Commit>();
  private tags = new Map<string, Tag>();
  private content = new Map<string, any>();

  // Collaboration data
  private documents = new Map<string, Document>();
  private tasks = new Map<string, Task>();
  private boards = new Map<string, Board>();
  private notifications = new Map<string, Notification[]>();
  private activities = new Map<string, ActivityFeedItem[]>();
  private shareLinks = new Map<string, ShareLink>();
  private marketplaceAssets = new Map<string, MarketplaceAsset>();
  private meetings = new Map<string, Meeting>();

  // Workspace store implementation
  workspace = {
    createWorkspace: async (workspace: any) => {
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
    getWorkspace: async (id: string) => this.workspaces.get(id) || null,
    getWorkspaceBySlug: async (slug: string) => {
      for (const ws of this.workspaces.values()) {
        if (ws.slug === slug) return ws;
      }
      return null;
    },
    updateWorkspace: async (id: string, updates: any) => {
      const workspace = this.workspaces.get(id);
      if (!workspace) throw new Error('Workspace not found');
      const updated = { ...workspace, ...updates, updatedAt: new Date() };
      this.workspaces.set(id, updated);
      return updated;
    },
    deleteWorkspace: async (id: string) => {
      this.workspaces.delete(id);
    },
    listWorkspaces: async (userId: string) => {
      return Array.from(this.workspaces.values());
    },
    addMember: async (member: any) => {
      const id = Math.random().toString(36).substring(7);
      const newMember = { ...member, id, joinedAt: new Date() };
      const members = this.members.get(member.workspaceId) || [];
      members.push(newMember);
      this.members.set(member.workspaceId, members);
      return newMember;
    },
    getMember: async (workspaceId: string, userId: string) => {
      const members = this.members.get(workspaceId) || [];
      return members.find(m => m.userId === userId) || null;
    },
    updateMemberRole: async (workspaceId: string, userId: string, role: any) => {
      const members = this.members.get(workspaceId) || [];
      const member = members.find(m => m.userId === userId);
      if (!member) throw new Error('Member not found');
      member.role = role;
      return member;
    },
    removeMember: async (workspaceId: string, userId: string) => {
      const members = this.members.get(workspaceId) || [];
      this.members.set(
        workspaceId,
        members.filter(m => m.userId !== userId)
      );
    },
    listMembers: async (workspaceId: string) => {
      return this.members.get(workspaceId) || [];
    },
    createProject: async (project: any) => {
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
    getProject: async (id: string) => this.projects.get(id) || null,
    updateProject: async (id: string, updates: any) => {
      const project = this.projects.get(id);
      if (!project) throw new Error('Project not found');
      const updated = { ...project, ...updates, updatedAt: new Date() };
      this.projects.set(id, updated);
      return updated;
    },
    deleteProject: async (id: string) => {
      this.projects.delete(id);
    },
    listProjects: async (workspaceId: string) => {
      return Array.from(this.projects.values()).filter(
        p => p.workspaceId === workspaceId
      );
    },
    addProjectMember: async (member: any) => {
      const id = Math.random().toString(36).substring(7);
      const newMember = { ...member, id, addedAt: new Date() };
      const members = this.projectMembers.get(member.projectId) || [];
      members.push(newMember);
      this.projectMembers.set(member.projectId, members);
      return newMember;
    },
    removeProjectMember: async (projectId: string, userId: string) => {
      const members = this.projectMembers.get(projectId) || [];
      this.projectMembers.set(
        projectId,
        members.filter(m => m.userId !== userId)
      );
    },
    listProjectMembers: async (projectId: string) => {
      return this.projectMembers.get(projectId) || [];
    },
    createInvitation: async (invitation: any) => {
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
    getInvitation: async (token: string) => this.invitations.get(token) || null,
    acceptInvitation: async (token: string, userId: string) => {
      const invitation = this.invitations.get(token);
      if (!invitation) throw new Error('Invitation not found');

      return this.workspace.addMember({
        workspaceId: invitation.workspaceId,
        userId,
        role: invitation.role,
        permissions: []
      });
    },
    listInvitations: async (workspaceId: string) => {
      return Array.from(this.invitations.values()).filter(
        i => i.workspaceId === workspaceId
      );
    },
    logActivity: async (activity: any) => {
      const id = Math.random().toString(36).substring(7);
      const newActivity = { ...activity, id, createdAt: new Date() };
      const activities = this.workspaceActivities.get(activity.workspaceId) || [];
      activities.unshift(newActivity);
      this.workspaceActivities.set(activity.workspaceId, activities);
      return newActivity;
    },
    getActivities: async (workspaceId: string, limit?: number) => {
      const activities = this.workspaceActivities.get(workspaceId) || [];
      return limit ? activities.slice(0, limit) : activities;
    }
  };

  // Simplified implementations for other stores
  sync: SyncStore = {
    getDocumentState: async (documentId: string) => this.documentStates.get(documentId) || null,
    saveDocumentState: async (state: DocumentState) => {
      this.documentStates.set(state.id, state);
    },
    appendOperation: async (documentId: string, operation: Operation) => {
      const ops = this.operations.get(documentId) || [];
      ops.push(operation);
      this.operations.set(documentId, ops);
    },
    getOperations: async (documentId: string, fromVersion: number) => {
      const ops = this.operations.get(documentId) || [];
      return ops.filter(op => op.version >= fromVersion);
    },
    createSession: async (session: SyncSession) => {
      this.sessions.set(session.id, session);
    },
    getSession: async (sessionId: string) => this.sessions.get(sessionId) || null,
    updateSession: async (sessionId: string, updates: any) => {
      const session = this.sessions.get(sessionId);
      if (!session) throw new Error('Session not found');
      const updated = { ...session, ...updates };
      this.sessions.set(sessionId, updated);
    },
    deleteSession: async (sessionId: string) => {
      this.sessions.delete(sessionId);
    },
    getActiveSessions: async (documentId: string) => {
      return Array.from(this.sessions.values()).filter(s => s.documentId === documentId);
    },
    updatePresence: async (presence: Presence) => {
      const presenceList = this.presence.get(presence.documentId) || [];
      const index = presenceList.findIndex(p => p.userId === presence.userId);
      if (index >= 0) {
        presenceList[index] = presence;
      } else {
        presenceList.push(presence);
      }
      this.presence.set(presence.documentId, presenceList);
    },
    getPresence: async (documentId: string) => this.presence.get(documentId) || [],
    removePresence: async (userId: string, documentId: string) => {
      const presenceList = this.presence.get(documentId) || [];
      this.presence.set(
        documentId,
        presenceList.filter(p => p.userId !== userId)
      );
    },
    acquireLock: async (lock: DocumentLock) => {
      const existingLock = this.locks.get(lock.documentId);
      if (existingLock && existingLock.expiresAt > new Date()) {
        return false;
      }
      this.locks.set(lock.documentId, lock);
      return true;
    },
    releaseLock: async (documentId: string, userId: string) => {
      this.locks.delete(documentId);
    },
    getLock: async (documentId: string) => this.locks.get(documentId) || null
  };

  // Additional store implementations would follow similar patterns
  comment: any = {}; // Simplified for brevity
  versionControl: any = {}; // Simplified for brevity
  document: any = {}; // Simplified for brevity
  task: any = {}; // Simplified for brevity
  notification: any = {}; // Simplified for brevity
  activity: any = {}; // Simplified for brevity
  sharing: any = {}; // Simplified for brevity
  marketplace: any = {}; // Simplified for brevity
  meeting: any = {}; // Simplified for brevity
}
