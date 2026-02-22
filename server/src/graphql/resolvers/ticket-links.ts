import { getPostgresPool } from '../../db/postgres';

const ticketLinksResolvers = {
    Query: {
        tickets: async (_: any, args: { provider: string; externalId?: string; limit?: number }) => {
            const pool = getPostgresPool();
            const { provider, externalId, limit = 10 } = args;

            let query = 'SELECT * FROM tickets WHERE provider = $1';
            const queryParams: any[] = [provider];

            if (externalId) {
                query += ' AND external_id = $2';
                queryParams.push(externalId);
            }

            query += ` LIMIT $${queryParams.length + 1}`;
            queryParams.push(limit);

            const res = await pool.query(query, queryParams);

            return res.rows.map((row: any) => ({
                ...row,
                externalId: row.external_id || row.externalId,
            }));
        },
    },
    Ticket: {
        runs: async (parent: any) => {
            const pool = getPostgresPool();
            // Ensure we have a valid ID to query with. 
            // If parent comes from DB it might have 'id' or 'external_id'.
            // The test mock returns 'externalId' directly now.
            // But typically we join on internal ID or external ID.
            // For the test mock sequence, it just expects A call.
            const res = await pool.query('SELECT * FROM runs JOIN ticket_run_links ON runs.id = ticket_run_links.run_id WHERE ticket_run_links.ticket_external_id = $1 AND ticket_run_links.ticket_provider = $2', [parent.externalId || parent.external_id, parent.provider]);
            return res.rows;
        },
        deployments: async (parent: any) => {
            const pool = getPostgresPool();
            const res = await pool.query('SELECT * FROM deployments JOIN ticket_deployment_links ON deployments.id = ticket_deployment_links.deployment_id WHERE ticket_deployment_links.ticket_external_id = $1 AND ticket_deployment_links.ticket_provider = $2', [parent.externalId || parent.external_id, parent.provider]);
            return res.rows;
        },
    },
};

export default ticketLinksResolvers;
