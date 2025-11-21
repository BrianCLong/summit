import { FastifyInstance } from 'fastify';
import { CollaborationHub } from '@intelgraph/collaboration';

export function setupRoutes(fastify: FastifyInstance, hub: CollaborationHub) {
  // Workspace routes
  fastify.post('/api/workspaces', async (request, reply) => {
    const { name, ownerId, description, slug } = request.body as any;
    const workspace = await hub.workspace.createWorkspace(name, ownerId, {
      description,
      slug
    });
    return workspace;
  });

  fastify.get('/api/workspaces/:id', async (request, reply) => {
    const { id } = request.params as any;
    const workspace = await hub.workspace.store.getWorkspace(id);
    if (!workspace) {
      reply.code(404);
      return { error: 'Workspace not found' };
    }
    return workspace;
  });

  fastify.get('/api/workspaces/:id/members', async (request, reply) => {
    const { id } = request.params as any;
    return hub.workspace.store.listMembers(id);
  });

  fastify.post('/api/workspaces/:id/invite', async (request, reply) => {
    const { id } = request.params as any;
    const { email, role, invitedBy } = request.body as any;
    const invitation = await hub.workspace.inviteMember(id, email, role, invitedBy);
    return invitation;
  });

  // Project routes
  fastify.post('/api/workspaces/:workspaceId/projects', async (request, reply) => {
    const { workspaceId } = request.params as any;
    const { name, ownerId, description, color, icon, isPrivate } = request.body as any;
    const project = await hub.workspace.createProject(workspaceId, name, ownerId, {
      description,
      color,
      icon,
      isPrivate
    });
    return project;
  });

  fastify.get('/api/workspaces/:workspaceId/projects', async (request, reply) => {
    const { workspaceId } = request.params as any;
    return hub.workspace.store.listProjects(workspaceId);
  });

  // Document routes
  fastify.post('/api/documents', async (request, reply) => {
    const { workspaceId, authorId, title, content, type, projectId, tags } = request.body as any;
    const document = await hub.createDocument(workspaceId, authorId, title, content, {
      type,
      projectId,
      tags
    });
    return document;
  });

  fastify.get('/api/documents/:id', async (request, reply) => {
    const { id } = request.params as any;
    const document = await hub.stores.document.getDocument(id);
    if (!document) {
      reply.code(404);
      return { error: 'Document not found' };
    }
    return document;
  });

  fastify.put('/api/documents/:id', async (request, reply) => {
    const { id } = request.params as any;
    const { userId, ...updates } = request.body as any;
    const document = await hub.updateDocument(id, userId, updates);
    return document;
  });

  fastify.get('/api/workspaces/:workspaceId/documents/search', async (request, reply) => {
    const { workspaceId } = request.params as any;
    const { q } = request.query as any;
    return hub.searchDocuments(workspaceId, q);
  });

  // Task routes
  fastify.post('/api/boards', async (request, reply) => {
    const { workspaceId, name, createdBy, type, projectId } = request.body as any;
    const board = await hub.createBoard(workspaceId, name, createdBy, { type, projectId });
    return board;
  });

  fastify.get('/api/workspaces/:workspaceId/boards', async (request, reply) => {
    const { workspaceId } = request.params as any;
    return hub.stores.task.listBoards(workspaceId);
  });

  fastify.post('/api/tasks', async (request, reply) => {
    const {
      workspaceId,
      boardId,
      reporterId,
      title,
      description,
      assigneeId,
      priority,
      dueDate,
      labels,
      projectId
    } = request.body as any;

    const task = await hub.createTask(workspaceId, boardId, reporterId, title, {
      description,
      assigneeId,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      labels,
      projectId
    });

    return task;
  });

  fastify.get('/api/boards/:boardId/tasks', async (request, reply) => {
    const { boardId } = request.params as any;
    return hub.stores.task.listTasks(boardId);
  });

  fastify.put('/api/tasks/:id/status', async (request, reply) => {
    const { id } = request.params as any;
    const { status, userId } = request.body as any;
    const task = await hub.updateTaskStatus(id, status, userId);
    return task;
  });

  // Comment routes
  fastify.post('/api/comments/threads', async (request, reply) => {
    const {
      workspaceId,
      resourceType,
      resourceId,
      createdBy,
      anchor,
      projectId
    } = request.body as any;

    const thread = await hub.comments.createThread(
      workspaceId,
      resourceType,
      resourceId,
      createdBy,
      anchor,
      { projectId }
    );

    return thread;
  });

  fastify.post('/api/comments/threads/:threadId/comments', async (request, reply) => {
    const { threadId } = request.params as any;
    const { authorId, content, attachments, parentCommentId } = request.body as any;

    const comment = await hub.comments.addComment(threadId, authorId, content, {
      attachments,
      parentCommentId
    });

    return comment;
  });

  fastify.get('/api/comments/threads/:threadId', async (request, reply) => {
    const { threadId } = request.params as any;
    const thread = await hub.comments.store.getThread(threadId);
    if (!thread) {
      reply.code(404);
      return { error: 'Thread not found' };
    }
    return thread;
  });

  fastify.get('/api/comments/threads/:threadId/comments', async (request, reply) => {
    const { threadId } = request.params as any;
    return hub.comments.store.listComments(threadId);
  });

  fastify.post('/api/comments/:commentId/reactions', async (request, reply) => {
    const { commentId } = request.params as any;
    const { userId, type } = request.body as any;
    return hub.comments.addReaction(commentId, userId, type);
  });

  // Notification routes
  fastify.get('/api/users/:userId/notifications', async (request, reply) => {
    const { userId } = request.params as any;
    const { unread } = request.query as any;
    return hub.stores.notification.getNotifications(userId, unread === 'true');
  });

  fastify.post('/api/notifications/:id/read', async (request, reply) => {
    const { id } = request.params as any;
    await hub.stores.notification.markAsRead(id);
    return { success: true };
  });

  fastify.post('/api/users/:userId/notifications/read-all', async (request, reply) => {
    const { userId } = request.params as any;
    await hub.markAllNotificationsAsRead(userId);
    return { success: true };
  });

  // Activity feed routes
  fastify.get('/api/workspaces/:workspaceId/activity', async (request, reply) => {
    const { workspaceId } = request.params as any;
    const { limit, offset } = request.query as any;
    return hub.getActivityFeed(workspaceId, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    });
  });

  // Share link routes
  fastify.post('/api/share', async (request, reply) => {
    const {
      workspaceId,
      resourceType,
      resourceId,
      type,
      createdBy,
      password,
      expiresAt,
      maxUses,
      allowAnonymous
    } = request.body as any;

    const link = await hub.createShareLink(
      workspaceId,
      resourceType,
      resourceId,
      type,
      createdBy,
      {
        password,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        maxUses,
        allowAnonymous
      }
    );

    return link;
  });

  fastify.get('/api/share/:token', async (request, reply) => {
    const { token } = request.params as any;
    const link = await hub.stores.sharing.getShareLink(token);
    if (!link) {
      reply.code(404);
      return { error: 'Share link not found' };
    }
    return link;
  });

  fastify.delete('/api/share/:linkId', async (request, reply) => {
    const { linkId } = request.params as any;
    await hub.revokeShareLink(linkId);
    return { success: true };
  });

  // Marketplace routes
  fastify.post('/api/marketplace/assets', async (request, reply) => {
    const {
      authorId,
      name,
      description,
      type,
      contentUrl,
      category,
      tags,
      price,
      isPublic
    } = request.body as any;

    const asset = await hub.publishToMarketplace(
      authorId,
      name,
      description,
      type,
      contentUrl,
      { category, tags, price, isPublic }
    );

    return asset;
  });

  fastify.get('/api/marketplace/assets/search', async (request, reply) => {
    const { q, category, type } = request.query as any;
    return hub.stores.marketplace.searchAssets(q, { category, type });
  });

  fastify.post('/api/marketplace/assets/:id/download', async (request, reply) => {
    const { id } = request.params as any;
    const { userId } = request.body as any;
    const contentUrl = await hub.downloadFromMarketplace(id, userId);
    return { contentUrl };
  });

  // Meeting routes
  fastify.post('/api/meetings', async (request, reply) => {
    const {
      workspaceId,
      hostId,
      title,
      description,
      scheduledAt,
      projectId,
      participants
    } = request.body as any;

    const meeting = await hub.scheduleMeeting(workspaceId, hostId, title, {
      description,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      projectId,
      participants
    });

    return meeting;
  });

  fastify.post('/api/meetings/:id/start', async (request, reply) => {
    const { id } = request.params as any;
    const meeting = await hub.startMeeting(id);
    return meeting;
  });

  fastify.get('/api/workspaces/:workspaceId/meetings', async (request, reply) => {
    const { workspaceId } = request.params as any;
    return hub.stores.meeting.listMeetings(workspaceId);
  });

  // Version control routes
  fastify.post('/api/version-control/repositories', async (request, reply) => {
    const { workspaceId, resourceType, resourceId, createdBy } = request.body as any;
    const repo = await hub.versionControl.initRepository(
      workspaceId,
      resourceType,
      resourceId,
      createdBy
    );
    return repo;
  });

  fastify.post('/api/version-control/repositories/:repoId/branches', async (request, reply) => {
    const { repoId } = request.params as any;
    const { name, sourceCommitId, createdBy } = request.body as any;
    const branch = await hub.versionControl.createBranch(
      repoId,
      name,
      sourceCommitId,
      createdBy
    );
    return branch;
  });

  fastify.post('/api/version-control/repositories/:repoId/commit', async (request, reply) => {
    const { repoId } = request.params as any;
    const { branchName, authorId, authorName, message, changes, description } =
      request.body as any;

    const commit = await hub.versionControl.commit(
      repoId,
      branchName,
      authorId,
      authorName,
      message,
      changes,
      { description }
    );

    return commit;
  });

  fastify.get('/api/version-control/repositories/:repoId/branches/:branchName/history', async (request, reply) => {
    const { repoId, branchName } = request.params as any;
    const { limit } = request.query as any;
    const history = await hub.versionControl.getCommitHistory(repoId, branchName, {
      limit: limit ? parseInt(limit) : undefined
    });
    return history;
  });
}
