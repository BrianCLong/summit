"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentManager = void 0;
const events_1 = require("events");
const types_1 = require("./types");
class CommentManager extends events_1.EventEmitter {
    store;
    constructor(store) {
        super();
        this.store = store;
    }
    // Thread management
    async createThread(workspaceId, resourceType, resourceId, createdBy, anchor, options) {
        const thread = await this.store.createThread({
            workspaceId,
            projectId: options?.projectId,
            resourceType,
            resourceId,
            anchorType: this.determineAnchorType(anchor),
            anchor,
            status: types_1.CommentStatus.OPEN,
            createdBy,
            metadata: options?.metadata
        });
        this.emit('thread:created', { thread });
        return thread;
    }
    async resolveThread(threadId, resolvedBy) {
        const thread = await this.store.updateThread(threadId, {
            status: types_1.CommentStatus.RESOLVED,
            resolvedBy,
            resolvedAt: new Date()
        });
        this.emit('thread:resolved', { thread, resolvedBy });
        // Notify participants
        const comments = await this.store.listComments(threadId);
        const participants = [...new Set(comments.map(c => c.authorId))];
        await this.notifyUsers(participants, threadId, 'resolution');
        return thread;
    }
    async reopenThread(threadId) {
        const thread = await this.store.updateThread(threadId, {
            status: types_1.CommentStatus.OPEN,
            resolvedBy: undefined,
            resolvedAt: undefined
        });
        this.emit('thread:reopened', { thread });
        return thread;
    }
    // Comment management
    async addComment(threadId, authorId, content, options) {
        // Extract mentions
        const mentions = this.extractMentions(content);
        // Generate plain text for search
        const plainText = content.map(c => c.content).join(' ');
        const comment = await this.store.createComment({
            threadId,
            authorId,
            content,
            plainText,
            attachments: options?.attachments || [],
            mentions,
            isEdited: false,
            parentCommentId: options?.parentCommentId
        });
        this.emit('comment:created', { comment });
        // Send notifications to mentioned users
        if (mentions.length > 0) {
            await this.notifyUsers(mentions, comment.id, 'mention');
        }
        // Notify thread participants
        const thread = await this.store.getThread(threadId);
        if (thread) {
            const comments = await this.store.listComments(threadId);
            const participants = [...new Set(comments.map(c => c.authorId).filter(id => id !== authorId))];
            await this.notifyUsers(participants, comment.id, 'reply');
        }
        return comment;
    }
    async editComment(commentId, content) {
        const mentions = this.extractMentions(content);
        const plainText = content.map(c => c.content).join(' ');
        const comment = await this.store.updateComment(commentId, {
            content,
            plainText,
            mentions,
            isEdited: true,
            editedAt: new Date()
        });
        this.emit('comment:edited', { comment });
        return comment;
    }
    async deleteComment(commentId, userId) {
        const comment = await this.store.getComment(commentId);
        if (!comment) {
            throw new Error('Comment not found');
        }
        if (comment.authorId !== userId) {
            throw new Error('Only the author can delete a comment');
        }
        await this.store.deleteComment(commentId);
        this.emit('comment:deleted', { commentId, threadId: comment.threadId });
    }
    // Reaction management
    async addReaction(commentId, userId, type) {
        const reaction = await this.store.addReaction({
            commentId,
            userId,
            type
        });
        this.emit('reaction:added', { reaction });
        // Notify comment author
        const comment = await this.store.getComment(commentId);
        if (comment && comment.authorId !== userId) {
            await this.notifyUsers([comment.authorId], commentId, 'reaction');
        }
        return reaction;
    }
    async removeReaction(commentId, userId, type) {
        await this.store.removeReaction(commentId, userId, type);
        this.emit('reaction:removed', { commentId, userId, type });
    }
    async getReactionsSummary(commentId) {
        const reactions = await this.store.getReactions(commentId);
        const summary = {};
        for (const reaction of reactions) {
            summary[reaction.type] = (summary[reaction.type] || 0) + 1;
        }
        return summary;
    }
    // Voting
    async upvoteComment(commentId, userId) {
        return this.store.addVote({ commentId, userId, value: 1 });
    }
    async downvoteComment(commentId, userId) {
        return this.store.addVote({ commentId, userId, value: -1 });
    }
    async getVoteScore(commentId) {
        const votes = await this.store.getVotes(commentId);
        const upvotes = votes.filter(v => v.value > 0).length;
        const downvotes = votes.filter(v => v.value < 0).length;
        const score = upvotes - downvotes;
        return { score, upvotes, downvotes };
    }
    // Annotation management
    async createAnnotation(workspaceId, resourceType, resourceId, createdBy, type, geometry, options) {
        const annotation = await this.store.createAnnotation({
            workspaceId,
            resourceType,
            resourceId,
            layerId: options?.layerId,
            type,
            geometry,
            style: options?.style || { color: '#FFFF00', opacity: 0.5 },
            content: options?.content,
            linkedCommentId: options?.linkedCommentId,
            createdBy,
            metadata: {}
        });
        this.emit('annotation:created', { annotation });
        return annotation;
    }
    async updateAnnotation(annotationId, updates) {
        const annotation = await this.store.updateAnnotation(annotationId, {
            ...updates,
            updatedAt: new Date()
        });
        this.emit('annotation:updated', { annotation });
        return annotation;
    }
    async deleteAnnotation(annotationId) {
        await this.store.deleteAnnotation(annotationId);
        this.emit('annotation:deleted', { annotationId });
    }
    // Layer management
    async createLayer(workspaceId, resourceId, name, createdBy, options) {
        const existingLayers = await this.store.listLayers(resourceId);
        const order = options?.order ?? existingLayers.length;
        const layer = await this.store.createLayer({
            workspaceId,
            resourceId,
            name,
            description: options?.description,
            isVisible: true,
            isLocked: false,
            opacity: 1.0,
            order,
            createdBy
        });
        this.emit('layer:created', { layer });
        return layer;
    }
    async toggleLayerVisibility(layerId) {
        const layer = await this.store.getLayer(layerId);
        if (!layer) {
            throw new Error('Layer not found');
        }
        return this.store.updateLayer(layerId, {
            isVisible: !layer.isVisible
        });
    }
    // Search and filter
    async searchComments(query, filter) {
        return this.store.searchThreads(query, filter);
    }
    async getCommentsForResource(resourceType, resourceId, status) {
        const threads = await this.store.listThreads({
            resourceType,
            resourceId,
            status
        });
        const comments = [];
        for (const thread of threads) {
            const threadComments = await this.store.listComments(thread.id);
            comments.push(...threadComments);
        }
        return { threads, comments };
    }
    // Notifications
    async getUnreadNotifications(userId) {
        return this.store.getNotifications(userId, true);
    }
    async markNotificationAsRead(notificationId) {
        await this.store.markAsRead(notificationId);
        this.emit('notification:read', { notificationId });
    }
    // Helper methods
    extractMentions(content) {
        const mentions = [];
        for (const block of content) {
            if (block.mentions) {
                mentions.push(...block.mentions.map(m => m.userId));
            }
        }
        return [...new Set(mentions)];
    }
    determineAnchorType(anchor) {
        if (anchor.textPosition)
            return 'text';
        if (anchor.elementId)
            return 'element';
        if (anchor.coordinates)
            return 'coordinate';
        return 'global';
    }
    async notifyUsers(userIds, commentId, type) {
        const comment = await this.store.getComment(commentId);
        if (!comment)
            return;
        for (const userId of userIds) {
            await this.store.createNotification({
                userId,
                commentId,
                threadId: comment.threadId,
                type,
                read: false
            });
        }
        this.emit('notifications:sent', { userIds, commentId, type });
    }
    // Analytics
    async getCommentStats(workspaceId, dateFrom, dateTo) {
        const filter = {
            workspaceId,
            dateFrom,
            dateTo
        };
        const threads = await this.store.listThreads(filter);
        const allComments = [];
        for (const thread of threads) {
            const comments = await this.store.listComments(thread.id);
            allComments.push(...comments);
        }
        return {
            totalThreads: threads.length,
            openThreads: threads.filter(t => t.status === types_1.CommentStatus.OPEN).length,
            resolvedThreads: threads.filter(t => t.status === types_1.CommentStatus.RESOLVED).length,
            totalComments: allComments.length,
            uniqueAuthors: new Set(allComments.map(c => c.authorId)).size,
            averageCommentsPerThread: allComments.length / threads.length,
            threadsWithAttachments: threads.filter(t => allComments.some(c => c.threadId === t.id && c.attachments.length > 0)).length
        };
    }
}
exports.CommentManager = CommentManager;
