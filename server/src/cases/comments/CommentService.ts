import { Pool } from 'pg';
import crypto from 'node:crypto';

export class CommentService {
    constructor(private pool: Pool) { }

    async addComment(
        data: {
            caseId: string;
            content: string;
            userId: string;
            metadata?: any;
        },
        tenantId: string
    ): Promise<any> {
        const id = crypto.randomUUID();
        // In a real app, this would insert into a database.
        return {
            id,
            ...data,
            tenantId,
            createdAt: new Date(),
            status: 'active'
        };
    }

    async listComments(caseId: string, tenantId: string, limit?: number, offset?: number): Promise<any[]> {
        return [];
    }
}
