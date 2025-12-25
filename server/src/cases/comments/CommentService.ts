import { Pool } from 'pg';

export class CommentService {
    constructor(private pool: Pool) { }

    async addComment(data: {
        caseId: string;
        content: string;
        authorId: string;
        type?: string;
        metadata?: any;
    }): Promise<any> {
        const id = crypto.randomUUID();
        // In a real app, this would insert into a database.
        return {
            id,
            ...data,
            createdAt: new Date(),
            status: 'active'
        };
    }

    async getComments(caseId: string): Promise<any[]> {
        return [];
    }
}
