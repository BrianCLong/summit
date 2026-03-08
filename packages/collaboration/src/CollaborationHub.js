"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborationHub = void 0;
const events_1 = require("events");
const workspace_1 = require("@intelgraph/workspace");
const real_time_sync_1 = require("@intelgraph/real-time-sync");
const commenting_1 = require("@intelgraph/commenting");
const version_control_1 = require("@intelgraph/version-control");
const types_1 = require("./types");
const nanoid_1 = require("nanoid");
/**
 * CollaborationHub - Central coordination point for all collaboration features
 */
class CollaborationHub extends events_1.EventEmitter {
    stores;
    workspace;
    sync;
    comments;
    versionControl;
    constructor(stores) {
        super();
        this.stores = stores;
        // Initialize subsystems
        this.workspace = new workspace_1.WorkspaceManager(stores.workspace);
        this.sync = new real_time_sync_1.SyncEngine(stores.sync);
        this.comments = new commenting_1.CommentManager(stores.comment);
        this.versionControl = new version_control_1.VersionControl(stores.versionControl);
        // Wire up cross-system events
        this.setupEventHandlers();
    }
    // Knowledge Base Management
    async createDocument(workspaceId, authorId, title, content, options) {
        const slug = this.generateSlug(title);
        const document = await this.stores.document.createDocument({
            workspaceId,
            projectId: options?.projectId,
            type: options?.type || types_1.DocumentType.WIKI,
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
        await this.versionControl.initRepository(workspaceId, 'document', document.id, authorId);
        await this.logActivity(workspaceId, authorId, 'created', 'document', document.id, title);
        this.emit('document:created', { document });
        return document;
    }
    async updateDocument(documentId, userId, updates) {
        const document = await this.stores.document.updateDocument(documentId, updates);
        // Create version control commit if content changed
        if (updates.content) {
            const repo = await this.stores.versionControl.getRepositoryForResource('document', documentId);
            if (repo) {
                await this.versionControl.commit(repo.id, 'main', userId, 'User', 'Update document content', [{
                        path: 'content',
                        type: 'modify',
                        contentHash: this.hashContent(updates.content),
                        previousHash: ''
                    }]);
            }
        }
        await this.logActivity(document.workspaceId, userId, 'updated', 'document', documentId, document.title);
        this.emit('document:updated', { document });
        return document;
    }
    async searchDocuments(workspaceId, query) {
        return this.stores.document.searchDocuments(query, workspaceId);
    }
    // Task Management
    async createTask(workspaceId, boardId, reporterId, title, options) {
        const task = await this.stores.task.createTask({
            workspaceId,
            projectId: options?.projectId,
            boardId,
            title,
            description: options?.description,
            status: types_1.TaskStatus.TODO,
            priority: options?.priority || 'medium',
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
            await this.notify(options.assigneeId, workspaceId, types_1.NotificationType.TASK_ASSIGNED, `New task assigned: ${title}`, `You have been assigned a new task`, `/tasks/${task.id}`);
        }
        await this.logActivity(workspaceId, reporterId, 'created', 'task', task.id, title);
        this.emit('task:created', { task });
        return task;
    }
    async updateTaskStatus(taskId, status, userId) {
        const task = await this.stores.task.getTask(taskId);
        if (!task) {
            throw new Error('Task not found');
        }
        const updated = await this.stores.task.updateTask(taskId, {
            status,
            completedAt: status === types_1.TaskStatus.DONE ? new Date() : undefined
        });
        // Notify assignee and reporter
        const recipients = [task.assigneeId, task.reporterId].filter(id => id && id !== userId);
        for (const recipientId of recipients) {
            await this.notify(recipientId, task.workspaceId, types_1.NotificationType.TASK_UPDATED, `Task status changed: ${task.title}`, `Task moved to ${status}`, `/tasks/${taskId}`);
        }
        await this.logActivity(task.workspaceId, userId, 'updated', 'task', taskId, task.title);
        this.emit('task:updated', { task: updated, oldStatus: task.status, newStatus: status });
        return updated;
    }
    async createBoard(workspaceId, name, createdBy, options) {
        const defaultColumns = options?.columns || [
            { id: (0, nanoid_1.nanoid)(), name: 'To Do', status: types_1.TaskStatus.TODO, order: 0 },
            { id: (0, nanoid_1.nanoid)(), name: 'In Progress', status: types_1.TaskStatus.IN_PROGRESS, order: 1 },
            { id: (0, nanoid_1.nanoid)(), name: 'Done', status: types_1.TaskStatus.DONE, order: 2 }
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
    async notify(userId, workspaceId, type, title, message, actionUrl, metadata) {
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
    async getUnreadNotifications(userId) {
        return this.stores.notification.getNotifications(userId, true);
    }
    async markAllNotificationsAsRead(userId) {
        await this.stores.notification.markAllAsRead(userId);
        this.emit('notifications:read', { userId });
    }
    // Activity Feed
    async logActivity(workspaceId, actorId, action, resourceType, resourceId, resourceName, metadata) {
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
    async getActivityFeed(workspaceId, options) {
        return this.stores.activity.getActivities(workspaceId, options);
    }
    // Sharing
    async createShareLink(workspaceId, resourceType, resourceId, type, createdBy, options) {
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
    async revokeShareLink(linkId) {
        await this.stores.sharing.revokeShareLink(linkId);
        this.emit('share:revoked', { linkId });
    }
    // Marketplace
    async publishToMarketplace(authorId, name, description, type, contentUrl, options) {
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
    async downloadFromMarketplace(assetId, userId) {
        const contentUrl = await this.stores.marketplace.downloadAsset(assetId, userId);
        this.emit('marketplace:downloaded', { assetId, userId });
        return contentUrl;
    }
    // Meeting Management
    async scheduleMeeting(workspaceId, hostId, title, options) {
        const meeting = await this.stores.meeting.createMeeting({
            workspaceId,
            projectId: options?.projectId,
            title,
            description: options?.description,
            hostId,
            participants: (options?.participants || []).map(userId => ({
                userId,
                role: 'participant'
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
            await this.notify(participantId, workspaceId, types_1.NotificationType.SYSTEM, `Meeting scheduled: ${title}`, `You've been invited to a meeting`, `/meetings/${meeting.id}`);
        }
        this.emit('meeting:scheduled', { meeting });
        return meeting;
    }
    async startMeeting(meetingId) {
        const meeting = await this.stores.meeting.updateMeeting(meetingId, {
            status: 'active',
            startedAt: new Date()
        });
        this.emit('meeting:started', { meeting });
        return meeting;
    }
    // Helper methods
    setupEventHandlers() {
        // Cross-system event wiring
        this.workspace.on('member.added', async ({ workspaceId, userId }) => {
            await this.notify(userId, workspaceId, types_1.NotificationType.WORKSPACE_INVITE, 'Welcome to the workspace', 'You have been added to a new workspace');
        });
        this.comments.on('comment:created', async ({ comment }) => {
            // Notifications are handled in CommentManager
        });
        this.sync.on('operation:applied', ({ documentId, operation }) => {
            this.emit('realtime:update', { documentId, operation });
        });
    }
    generateSlug(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            + '-' + (0, nanoid_1.nanoid)(8);
    }
    hashContent(content) {
        // Simple hash for demo - use proper crypto in production
        return Buffer.from(content).toString('base64').slice(0, 32);
    }
}
exports.CollaborationHub = CollaborationHub;
