import { EventEmitter } from 'events';
import { WorkspaceManager, WorkspaceStore } from '@intelgraph/workspace';
import { SyncEngine, SyncStore } from '@intelgraph/real-time-sync';
import { CommentManager, CommentStore } from '@intelgraph/commenting';
import { VersionControl, VersionControlStore } from '@intelgraph/version-control';
import {
  Document,
  Task,
  Board,
  Notification,
  ActivityFeedItem,
  ShareLink,
  MarketplaceAsset,
  Meeting,
  DocumentType,
  TaskStatus,
  NotificationType,
  ShareLinkType
} from './types';
import { nanoid } from 'nanoid';

export interface CollaborationStores {
  workspace: WorkspaceStore;
  sync: SyncStore;
  comment: CommentStore;
  versionControl: VersionControlStore;
  document: DocumentStore;
  task: TaskStore;
  notification: NotificationStore;
  activity: ActivityStore;
  sharing: SharingStore;
  marketplace: MarketplaceStore;
  meeting: MeetingStore;
}

export interface DocumentStore {
  createDocument(doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document>;
  getDocument(id: string): Promise<Document | null>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  listDocuments(workspaceId: string, filters?: any): Promise<Document[]>;
  searchDocuments(query: string, workspaceId: string): Promise<Document[]>;
}

export interface TaskStore {
  createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  getTask(id: string): Promise<Task | null>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  listTasks(boardId: string): Promise<Task[]>;
  createBoard(board: Omit<Board, 'id' | 'createdAt'>): Promise<Board>;
  getBoard(id: string): Promise<Board | null>;
  listBoards(workspaceId: string): Promise<Board[]>;
}

export interface NotificationStore {
  createNotification(notif: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  getNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
}

export interface ActivityStore {
  logActivity(activity: Omit<ActivityFeedItem, 'id' | 'timestamp'>): Promise<ActivityFeedItem>;
  getActivities(workspaceId: string, options?: any): Promise<ActivityFeedItem[]>;
  getUserActivities(userId: string, options?: any): Promise<ActivityFeedItem[]>;
}

export interface SharingStore {
  createShareLink(link: Omit<ShareLink, 'id' | 'createdAt' | 'token'>): Promise<ShareLink>;
  getShareLink(token: string): Promise<ShareLink | null>;
  revokeShareLink(linkId: string): Promise<void>;
  listShareLinks(resourceId: string): Promise<ShareLink[]>;
}

export interface MarketplaceStore {
  publishAsset(asset: Omit<MarketplaceAsset, 'id' | 'createdAt' | 'updatedAt'>): Promise<MarketplaceAsset>;
  getAsset(id: string): Promise<MarketplaceAsset | null>;
  searchAssets(query: string, filters?: any): Promise<MarketplaceAsset[]>;
  downloadAsset(assetId: string, userId: string): Promise<string>;
}

export interface MeetingStore {
  createMeeting(meeting: Omit<Meeting, 'id' | 'createdAt'>): Promise<Meeting>;
  getMeeting(id: string): Promise<Meeting | null>;
  updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting>;
  listMeetings(workspaceId: string): Promise<Meeting[]>;
}

/**
 * CollaborationHub - Central coordination point for all collaboration features
 */
export class CollaborationHub extends EventEmitter {
  public workspace: WorkspaceManager;
  public sync: SyncEngine;
  public comments: CommentManager;
  public versionControl: VersionControl;

  constructor(private stores: CollaborationStores) {
    super();

    // Initialize subsystems
    this.workspace = new WorkspaceManager(stores.workspace);
    this.sync = new SyncEngine(stores.sync);
    this.comments = new CommentManager(stores.comment);
    this.versionControl = new VersionControl(stores.versionControl);

    // Wire up cross-system events
    this.setupEventHandlers();
  }

  // Knowledge Base Management
  async createDocument(
    workspaceId: string,
    authorId: string,
    title: string,
    content: string,
    options?: {
      type?: DocumentType;
      projectId?: string;
      tags?: string[];
      parentDocumentId?: string;
    }
  ): Promise<Document> {
    const slug = this.generateSlug(title);

    const document = await this.stores.document.createDocument({
      workspaceId,
      projectId: options?.projectId,
      type: options?.type || DocumentType.WIKI,
      title,
      slug,
      content,
      authorId,
      collaborators: [authorId],
      tags: options?.tags || [],
      isPublished: false,
      parentDocumentId: options?.parentDocumentId,
      order: 0
    });

    // Initialize version control for document
    await this.versionControl.initRepository(
      workspaceId,
      'document',
      document.id,
      authorId
    );

    await this.logActivity(workspaceId, authorId, 'created', 'document', document.id, title);
    this.emit('document:created', { document });

    return document;
  }

  async updateDocument(
    documentId: string,
    userId: string,
    updates: Partial<Document>
  ): Promise<Document> {
    const document = await this.stores.document.updateDocument(documentId, updates);

    // Create version control commit if content changed
    if (updates.content) {
      const repo = await this.stores.versionControl.getRepositoryForResource(
        'document',
        documentId
      );

      if (repo) {
        await this.versionControl.commit(
          repo.id,
          'main',
          userId,
          'User',
          'Update document content',
          [{
            path: 'content',
            type: 'modify' as any,
            contentHash: this.hashContent(updates.content),
            previousHash: ''
          }]
        );
      }
    }

    await this.logActivity(document.workspaceId, userId, 'updated', 'document', documentId, document.title);
    this.emit('document:updated', { document });

    return document;
  }

  async searchDocuments(workspaceId: string, query: string): Promise<Document[]> {
    return this.stores.document.searchDocuments(query, workspaceId);
  }

  // Task Management
  async createTask(
    workspaceId: string,
    boardId: string,
    reporterId: string,
    title: string,
    options?: {
      description?: string;
      assigneeId?: string;
      priority?: Task['priority'];
      dueDate?: Date;
      labels?: string[];
      projectId?: string;
    }
  ): Promise<Task> {
    const task = await this.stores.task.createTask({
      workspaceId,
      projectId: options?.projectId,
      boardId,
      title,
      description: options?.description,
      status: TaskStatus.TODO,
      priority: options?.priority || 'medium' as any,
      assigneeId: options?.assigneeId,
      reporterId,
      dueDate: options?.dueDate,
      labels: options?.labels || [],
      dependencies: [],
      blockedBy: [],
      subtasks: []
    });

    // Send notification to assignee
    if (options?.assigneeId) {
      await this.notify(
        options.assigneeId,
        workspaceId,
        NotificationType.TASK_ASSIGNED,
        `New task assigned: ${title}`,
        `You have been assigned a new task`,
        `/tasks/${task.id}`
      );
    }

    await this.logActivity(workspaceId, reporterId, 'created', 'task', task.id, title);
    this.emit('task:created', { task });

    return task;
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    userId: string
  ): Promise<Task> {
    const task = await this.stores.task.getTask(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const updated = await this.stores.task.updateTask(taskId, {
      status,
      completedAt: status === TaskStatus.DONE ? new Date() : undefined
    });

    // Notify assignee and reporter
    const recipients = [task.assigneeId, task.reporterId].filter(
      id => id && id !== userId
    ) as string[];

    for (const recipientId of recipients) {
      await this.notify(
        recipientId,
        task.workspaceId,
        NotificationType.TASK_UPDATED,
        `Task status changed: ${task.title}`,
        `Task moved to ${status}`,
        `/tasks/${taskId}`
      );
    }

    await this.logActivity(task.workspaceId, userId, 'updated', 'task', taskId, task.title);
    this.emit('task:updated', { task: updated, oldStatus: task.status, newStatus: status });

    return updated;
  }

  async createBoard(
    workspaceId: string,
    name: string,
    createdBy: string,
    options?: {
      type?: Board['type'];
      projectId?: string;
      columns?: Board['columns'];
    }
  ): Promise<Board> {
    const defaultColumns: Board['columns'] = options?.columns || [
      { id: nanoid(), name: 'To Do', status: TaskStatus.TODO, order: 0 },
      { id: nanoid(), name: 'In Progress', status: TaskStatus.IN_PROGRESS, order: 1 },
      { id: nanoid(), name: 'Done', status: TaskStatus.DONE, order: 2 }
    ];

    const board = await this.stores.task.createBoard({
      workspaceId,
      projectId: options?.projectId,
      name,
      type: options?.type || 'kanban',
      columns: defaultColumns,
      createdBy
    });

    this.emit('board:created', { board });

    return board;
  }

  // Notifications
  async notify(
    userId: string,
    workspaceId: string,
    type: NotificationType,
    title: string,
    message: string,
    actionUrl?: string,
    metadata?: Record<string, any>
  ): Promise<Notification> {
    const notification = await this.stores.notification.createNotification({
      userId,
      workspaceId,
      type,
      title,
      message,
      actionUrl,
      metadata,
      read: false
    });

    this.emit('notification:created', { notification });

    return notification;
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return this.stores.notification.getNotifications(userId, true);
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await this.stores.notification.markAllAsRead(userId);
    this.emit('notifications:read', { userId });
  }

  // Activity Feed
  async logActivity(
    workspaceId: string,
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    resourceName?: string,
    metadata?: Record<string, any>
  ): Promise<ActivityFeedItem> {
    const activity = await this.stores.activity.logActivity({
      workspaceId,
      actorId,
      actorName: 'User', // Would fetch from user service
      action,
      resourceType,
      resourceId,
      resourceName,
      metadata
    });

    this.emit('activity:logged', { activity });

    return activity;
  }

  async getActivityFeed(
    workspaceId: string,
    options?: {
      limit?: number;
      offset?: number;
      actorId?: string;
      resourceType?: string;
    }
  ): Promise<ActivityFeedItem[]> {
    return this.stores.activity.getActivities(workspaceId, options);
  }

  // Sharing
  async createShareLink(
    workspaceId: string,
    resourceType: string,
    resourceId: string,
    type: ShareLinkType,
    createdBy: string,
    options?: {
      password?: string;
      expiresAt?: Date;
      maxUses?: number;
      allowAnonymous?: boolean;
    }
  ): Promise<ShareLink> {
    const link = await this.stores.sharing.createShareLink({
      workspaceId,
      resourceType,
      resourceId,
      type,
      password: options?.password,
      expiresAt: options?.expiresAt,
      maxUses: options?.maxUses,
      uses: 0,
      allowAnonymous: options?.allowAnonymous || false,
      createdBy
    });

    await this.logActivity(workspaceId, createdBy, 'shared', resourceType, resourceId);
    this.emit('share:created', { link });

    return link;
  }

  async revokeShareLink(linkId: string): Promise<void> {
    await this.stores.sharing.revokeShareLink(linkId);
    this.emit('share:revoked', { linkId });
  }

  // Marketplace
  async publishToMarketplace(
    authorId: string,
    name: string,
    description: string,
    type: MarketplaceAsset['type'],
    contentUrl: string,
    options?: {
      category?: string;
      tags?: string[];
      price?: number;
      isPublic?: boolean;
    }
  ): Promise<MarketplaceAsset> {
    const asset = await this.stores.marketplace.publishAsset({
      type,
      name,
      description,
      version: '1.0.0',
      authorId,
      authorName: 'User',
      category: options?.category || 'general',
      tags: options?.tags || [],
      contentUrl,
      isPublic: options?.isPublic ?? true,
      price: options?.price || 0,
      rating: 0,
      ratingCount: 0,
      downloadCount: 0,
      changelog: []
    });

    this.emit('marketplace:published', { asset });

    return asset;
  }

  async downloadFromMarketplace(assetId: string, userId: string): Promise<string> {
    const contentUrl = await this.stores.marketplace.downloadAsset(assetId, userId);

    this.emit('marketplace:downloaded', { assetId, userId });

    return contentUrl;
  }

  // Meeting Management
  async scheduleMeeting(
    workspaceId: string,
    hostId: string,
    title: string,
    options?: {
      description?: string;
      scheduledAt?: Date;
      projectId?: string;
      participants?: string[];
    }
  ): Promise<Meeting> {
    const meeting = await this.stores.meeting.createMeeting({
      workspaceId,
      projectId: options?.projectId,
      title,
      description: options?.description,
      hostId,
      participants: (options?.participants || []).map(userId => ({
        userId,
        role: 'participant' as const
      })),
      scheduledAt: options?.scheduledAt,
      status: 'scheduled',
      settings: {
        enableRecording: false,
        enableTranscription: false,
        allowScreenShare: true,
        enableChat: true
      }
    });

    // Notify participants
    for (const participantId of options?.participants || []) {
      await this.notify(
        participantId,
        workspaceId,
        NotificationType.SYSTEM,
        `Meeting scheduled: ${title}`,
        `You've been invited to a meeting`,
        `/meetings/${meeting.id}`
      );
    }

    this.emit('meeting:scheduled', { meeting });

    return meeting;
  }

  async startMeeting(meetingId: string): Promise<Meeting> {
    const meeting = await this.stores.meeting.updateMeeting(meetingId, {
      status: 'active',
      startedAt: new Date()
    });

    this.emit('meeting:started', { meeting });

    return meeting;
  }

  // Helper methods
  private setupEventHandlers(): void {
    // Cross-system event wiring
    this.workspace.on('member.added', async ({ workspaceId, userId }) => {
      await this.notify(
        userId,
        workspaceId,
        NotificationType.WORKSPACE_INVITE,
        'Welcome to the workspace',
        'You have been added to a new workspace'
      );
    });

    this.comments.on('comment:created', async ({ comment }) => {
      // Notifications are handled in CommentManager
    });

    this.sync.on('operation:applied', ({ documentId, operation }) => {
      this.emit('realtime:update', { documentId, operation });
    });
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + nanoid(8);
  }

  private hashContent(content: string): string {
    // Simple hash for demo - use proper crypto in production
    return Buffer.from(content).toString('base64').slice(0, 32);
  }
}
