import { CommentService, AddCommentInput } from '../../cases/comments/CommentService.js';
import { getPostgresPool } from '../../db/postgres.js';
import { authGuard } from '../utils/auth.js';
import { GraphQLContext } from '../apollo-v5-server.js';

const pg = getPostgresPool();
const commentService = new CommentService(pg);

export const commentResolvers = {
  Query: {
    comments: authGuard(async (
      _: any,
      { targetType, targetId, limit, offset }: { targetType: string; targetId: string; limit?: number; offset?: number },
      context: GraphQLContext
    ) => {
      const tenantId = context.user!.tenantId;
      return commentService.listComments({ targetType, targetId, tenantId, limit, offset });
    }),
  },
  Mutation: {
    addComment: authGuard(async (
      _: any,
      { input }: { input: Omit<AddCommentInput, 'tenantId' | 'authorId'> },
      context: GraphQLContext
    ) => {
      const tenantId = context.user!.tenantId;
      const authorId = context.user!.id;
      return commentService.addComment({
        ...input,
        tenantId,
        authorId,
      });
    }),
    updateComment: authGuard(async (
      _: any,
      { id, content }: { id: string; content: string },
      context: GraphQLContext
    ) => {
      const userId = context.user!.id;
      return commentService.updateComment(id, content, userId);
    }),
    deleteComment: authGuard(async (
      _: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      const userId = context.user!.id;
      return commentService.deleteComment(id, userId);
    }),
  },
  Comment: {
    author: async (comment: any) => {
      // Logic to fetch author details from user service or repo
      return { id: comment.authorId, name: 'Author Name' }; // Placeholder
    },
  }
};
