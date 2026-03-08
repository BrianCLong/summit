"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_js_1 = require("../../db/postgres.js");
const ticketLinksResolvers = {
    Query: {
        tickets: async (_, args) => {
            const pool = (0, postgres_js_1.getPostgresPool)();
            const { provider, externalId, limit = 10 } = args;
            let query = 'SELECT * FROM tickets WHERE provider = $1';
            const queryParams = [provider];
            if (externalId) {
                query += ' AND external_id = $2';
                queryParams.push(externalId);
            }
            query += ` LIMIT $${queryParams.length + 1}`;
            queryParams.push(limit);
            const res = await pool.query(query, queryParams);
            return res.rows.map((row) => ({
                ...row,
                externalId: row.external_id || row.externalId,
            }));
        },
    },
    Ticket: {
        runs: async (parent) => {
            const pool = (0, postgres_js_1.getPostgresPool)();
            // Ensure we have a valid ID to query with. 
            // If parent comes from DB it might have 'id' or 'external_id'.
            // The test mock returns 'externalId' directly now.
            // But typically we join on internal ID or external ID.
            // For the test mock sequence, it just expects A call.
            const res = await pool.query('SELECT * FROM runs JOIN ticket_run_links ON runs.id = ticket_run_links.run_id WHERE ticket_run_links.ticket_external_id = $1 AND ticket_run_links.ticket_provider = $2', [parent.externalId || parent.external_id, parent.provider]);
            return res.rows;
        },
        deployments: async (parent) => {
            const pool = (0, postgres_js_1.getPostgresPool)();
            const res = await pool.query('SELECT * FROM deployments JOIN ticket_deployment_links ON deployments.id = ticket_deployment_links.deployment_id WHERE ticket_deployment_links.ticket_external_id = $1 AND ticket_deployment_links.ticket_provider = $2', [parent.externalId || parent.external_id, parent.provider]);
            return res.rows;
        },
    },
};
exports.default = ticketLinksResolvers;
