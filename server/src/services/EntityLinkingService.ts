
export default class EntityLinkingService {
    async linkEntity(entity: any, context?: any): Promise<any[]> {
        return [];
    }
    async findLinks(text: string): Promise<any[]> {
        return [];
    }
    static async suggestLinksForEntity(entityId: string, context?: any): Promise<any> {
        return { success: true, links: [] };
    }
}
