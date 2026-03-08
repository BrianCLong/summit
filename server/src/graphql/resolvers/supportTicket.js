"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const support_tickets_js_1 = require("../../services/support-tickets.js");
const supportTicketResolvers = {
    Query: {
        supportTicket: async (_, { id }) => {
            return (0, support_tickets_js_1.getTicketById)(id);
        },
        supportTickets: async (_, { filter, limit, offset, }) => {
            const options = {
                ...(filter || {}),
                limit: limit || 50,
                offset: offset || 0,
            };
            const [data, total] = await Promise.all([
                (0, support_tickets_js_1.listTickets)(options),
                (0, support_tickets_js_1.getTicketCount)(options),
            ]);
            return { data, total };
        },
    },
    Mutation: {
        createSupportTicket: async (_, { input }, context) => {
            const user = context?.user;
            return (0, support_tickets_js_1.createTicket)({
                ...input,
                reporter_id: user?.sub || user?.id || 'anonymous',
                reporter_email: user?.email,
            });
        },
        updateSupportTicket: async (_, { id, input }) => {
            return (0, support_tickets_js_1.updateTicket)(id, input);
        },
        deleteSupportTicket: async (_, { id }) => {
            return (0, support_tickets_js_1.deleteTicket)(id);
        },
        addSupportTicketComment: async (_, { ticketId, content, isInternal, }, context) => {
            const user = context?.user;
            return (0, support_tickets_js_1.addComment)(ticketId, user?.sub || user?.id || 'anonymous', content, {
                authorEmail: user?.email,
                isInternal: isInternal || false,
            });
        },
    },
    SupportTicket: {
        comments: async (parent, args, context) => {
            let comments;
            // Use DataLoader if available, otherwise fall back to service
            if (context?.loaders?.supportTicketLoader) {
                comments = await context.loaders.supportTicketLoader.load(parent.id);
            }
            else {
                comments = await (0, support_tickets_js_1.getComments)(parent.id);
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
exports.default = supportTicketResolvers;
