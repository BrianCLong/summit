"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentResolvers = void 0;
const CommentService_js_1 = require("../../cases/comments/CommentService.js");
const postgres_js_1 = require("../../db/postgres.js");
const auth_js_1 = require("../utils/auth.js");
const pg = (0, postgres_js_1.getPostgresPool)();
const commentService = new CommentService_js_1.CommentService(pg);
exports.commentResolvers = {
    Query: {
        comments: (0, auth_js_1.authGuard)(async (_, { targetType, targetId, limit, offset }, context) => {
            const tenantId = context.user.tenantId;
            return commentService.listComments({ targetType, targetId, tenantId, limit, offset });
        }),
    },
    Mutation: {
        addComment: (0, auth_js_1.authGuard)(async (_, { input }, context) => {
            const tenantId = context.user.tenantId;
            const authorId = context.user.id;
            return commentService.addComment({
                ...input,
                tenantId,
                authorId,
            });
        }),
        updateComment: (0, auth_js_1.authGuard)(async (_, { id, content }, context) => {
            const userId = context.user.id;
            return commentService.updateComment(id, content, userId);
        }),
        deleteComment: (0, auth_js_1.authGuard)(async (_, { id }, context) => {
            const userId = context.user.id;
            return commentService.deleteComment(id, userId);
        }),
    },
    Comment: {
        author: async (comment) => {
            // Logic to fetch author details from user service or repo
            return { id: comment.authorId, name: 'Author Name' }; // Placeholder
        },
    }
};
