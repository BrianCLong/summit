import {
  createTicket,
  getTicketById,
  listTickets,
  updateTicket,
  deleteTicket,
  addComment,
  getComments,
  getTicketCount,
} from '../../services/support-tickets.js';

const supportTicketResolvers = {
  Query: {
    supportTicket: async (_: unknown, { id }: { id: string }) => {
      return getTicketById(id);
    },
    supportTickets: async (
      _: unknown,
      {
        filter,
        limit,
        offset,
      }: {
        filter?: Record<string, unknown>;
        limit?: number;
        offset?: number;
      },
    ) => {
      const options = {
        ...(filter || {}),
        limit: limit || 50,
        offset: offset || 0,
      };
      const [data, total] = await Promise.all([
        listTickets(options as any),
        getTicketCount(options as any),
      ]);
      return { data, total };
    },
  },
  Mutation: {
    createSupportTicket: async (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      context: any,
    ) => {
      const user = context?.user;
      return createTicket({
        ...input,
        reporter_id: user?.sub || user?.id || 'anonymous',
        reporter_email: user?.email,
      } as any);
    },
    updateSupportTicket: async (
      _: unknown,
      { id, input }: { id: string; input: Record<string, unknown> },
    ) => {
      return updateTicket(id, input as any);
    },
    deleteSupportTicket: async (_: unknown, { id }: { id: string }) => {
      return deleteTicket(id);
    },
    addSupportTicketComment: async (
      _: unknown,
      {
        ticketId,
        content,
        isInternal,
      }: { ticketId: string; content: string; isInternal?: boolean },
      context: any,
    ) => {
      const user = context?.user;
      return addComment(ticketId, user?.sub || user?.id || 'anonymous', content, {
        authorEmail: user?.email,
        isInternal: isInternal || false,
      });
    },
  },
  SupportTicket: {
    comments: async (parent: { id: string }, args: { limit?: number; offset?: number }, context: any) => {
      let comments;
      // Use DataLoader if available, otherwise fall back to service
      if (context?.loaders?.supportTicketLoader) {
        comments = await context.loaders.supportTicketLoader.load(parent.id);
      } else {
        comments = await getComments(parent.id);
      }

      // Handle pagination in memory (since loader fetches all)
      if (args.limit !== undefined || args.offset !== undefined) {
        const offset = args.offset || 0;
        const limit = args.limit || 100;
        return comments.slice(offset, offset + limit);
      }

      return comments;
    },
  },
};

export default supportTicketResolvers;
