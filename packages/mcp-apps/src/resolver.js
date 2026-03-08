"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpUiResolver = void 0;
/**
 * Resolver for ui:// resources
 */
class McpUiResolver {
    mcpClient;
    constructor(mcpClient) {
        this.mcpClient = mcpClient;
    }
    /**
     * Resolves a ui:// URI to an McpUiResource
     * URI format: ui://<server-name>/<path>
     */
    async resolve(uri) {
        if (!uri.startsWith('ui://')) {
            throw new Error(`Invalid MCP UI URI: ${uri}`);
        }
        const path = uri.slice(5);
        const slashIndex = path.indexOf('/');
        if (slashIndex === -1) {
            throw new Error(`Invalid MCP UI URI format (expected ui://server/path): ${uri}`);
        }
        const serverName = path.slice(0, slashIndex);
        const resourcePath = path.slice(slashIndex + 1);
        if (!serverName) {
            throw new Error(`Missing server name in MCP UI URI: ${uri}`);
        }
        try {
            const response = await this.mcpClient.getResource(serverName, uri);
            // Map MCP ReadResourceResult to McpUiResource
            // response.contents is an array: [{ uri: string, text?: string, blob?: string }]
            const content = response.contents?.[0];
            if (!content) {
                throw new Error('Resource returned no content');
            }
            return {
                uri: content.uri || uri,
                template: content.text || (content.blob ? atob(content.blob) : ''),
                metadata: response.metadata
            };
        }
        catch (error) {
            throw new Error(`Failed to resolve MCP UI resource ${uri}: ${error.message}`);
        }
    }
}
exports.McpUiResolver = McpUiResolver;
