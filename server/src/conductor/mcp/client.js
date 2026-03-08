"use strict";
// MCP (Model Context Protocol) Client for JSON-RPC 2.0 communication
// Handles persistent connections to MCP servers with auth and error handling
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mcpClient = exports.mcpRegistry = exports.MCPServerRegistry = exports.MCPClient = void 0;
exports.initializeMCPClient = initializeMCPClient;
exports.executeToolAnywhere = executeToolAnywhere;
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const registry_js_1 = require("./transport/registry.js");
const prometheus_js_1 = require("../observability/prometheus.js");
// Load allowed executor URLs from environment variable
const allowedExecutorUrls = process.env.MCP_ALLOWED_EXECUTOR_URLS
    ? process.env.MCP_ALLOWED_EXECUTOR_URLS.split(',').map((url) => url.trim())
    : [];
class MCPClient {
    servers;
    options;
    registry;
    sessions = new Map();
    pendingRequests = new Map();
    constructor(servers, options = {}, registry = (0, registry_js_1.createDefaultTransportRegistry)()) {
        this.servers = servers;
        this.options = options;
        this.registry = registry;
        this.options = {
            timeout: 30000,
            retryAttempts: 3,
            retryDelay: 1000,
            transport: 'jsonrpc',
            negotiationPolicy: 'strict',
            ...options,
        };
    }
    /**
     * Connect to an MCP server
     */
    async connect(serverName, options) {
        const config = this.servers[serverName];
        if (!config) {
            throw new Error(`MCP server '${serverName}' not configured`);
        }
        // Enforce allowlist
        if (allowedExecutorUrls.length > 0 &&
            !allowedExecutorUrls.includes(config.url)) {
            logger_js_1.default.error(`Attempted to connect to disallowed MCP server URL: ${config.url}`);
            throw new Error(`Connection to '${config.url}' is not allowed by policy.`);
        }
        if (this.sessions.has(serverName)) {
            await this.sessions.get(serverName)?.close();
        }
        const selection = (0, registry_js_1.selectTransportName)(this.options.transport ?? 'jsonrpc', this.options.negotiationPolicy ?? 'strict', this.registry);
        if (selection.warning) {
            logger_js_1.default.warn(selection.warning);
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('mcp_transport_fallback', {
                success: true,
                transport: selection.name,
                fallback_from: selection.fallbackFrom,
            });
        }
        const session = this.registry.createClientSession(selection.name, config);
        this.sessions.set(serverName, session);
        session.recv((message) => {
            this.handleMessage(message.payload);
        });
        session.onError?.((error) => {
            logger_js_1.default.error(`MCP transport error for ${serverName} (${config.url}):`, error);
        });
        session.onClose?.(() => {
            logger_js_1.default.info(`Disconnected from MCP server: ${serverName} (${config.url})`);
            this.sessions.delete(serverName);
            let attempt = 0;
            const retry = () => {
                const delay = Math.min(30000, 1000 * 2 ** attempt++);
                setTimeout(() => {
                    this.connect(serverName).catch(() => retry());
                }, delay);
            };
            retry();
        });
        try {
            await session.connect(options);
        }
        catch (error) {
            this.sessions.delete(serverName);
            throw error;
        }
        logger_js_1.default.info(`Connected to MCP server: ${serverName} (${config.url})`);
        // Audit pin state (placeholder for now)
        // writeAudit({ action: 'mcp_connect', resourceType: 'mcp_server', resourceId: serverName, details: { url: config.url, pinned: false, pin_status: 'not_implemented' } });
    }
    /**
     * Disconnect from an MCP server
     */
    async disconnect(serverName) {
        const session = this.sessions.get(serverName);
        if (session) {
            await session.close();
            this.sessions.delete(serverName);
        }
    }
    /**
     * Disconnect from all servers
     */
    async disconnectAll() {
        const promises = Array.from(this.sessions.keys()).map((serverName) => this.disconnect(serverName));
        await Promise.all(promises);
    }
    /**
     * Execute a tool on a specific MCP server
     */
    async executeTool(serverName, toolName, args, userScopes) {
        const config = this.servers[serverName];
        if (!config) {
            throw new Error(`MCP server '${serverName}' not configured`);
        }
        // Check tool authorization
        const tool = config.tools.find((t) => t.name === toolName);
        if (!tool) {
            throw new Error(`Tool '${toolName}' not found on server '${serverName}'`);
        }
        if (tool.scopes && userScopes) {
            const hasRequiredScopes = tool.scopes.every((scope) => userScopes.includes(scope));
            if (!hasRequiredScopes) {
                throw new Error(`Insufficient scopes for tool '${toolName}'. Required: ${tool.scopes.join(', ')}`);
            }
        }
        // Ensure connection exists
        if (!this.sessions.has(serverName)) {
            await this.connect(serverName);
        }
        const request = {
            jsonrpc: '2.0',
            id: (0, crypto_1.randomUUID)(),
            method: 'tools/execute',
            params: {
                name: toolName,
                arguments: args,
            },
        };
        return this.sendRequest(serverName, request);
    }
    /**
     * List available tools on a server
     */
    async listTools(serverName) {
        const config = this.servers[serverName];
        if (!config) {
            throw new Error(`MCP server '${serverName}' not configured`);
        }
        // Return cached tools for now
        // In a full implementation, this would query the server
        return config.tools;
    }
    /**
     * Get server capabilities and info
     */
    async getServerInfo(serverName) {
        if (!this.sessions.has(serverName)) {
            await this.connect(serverName);
        }
        const request = {
            jsonrpc: '2.0',
            id: (0, crypto_1.randomUUID)(),
            method: 'server/info',
        };
        return this.sendRequest(serverName, request);
    }
    /**
     * Send a raw JSON-RPC request
     */
    async sendRequest(serverName, request) {
        const session = this.sessions.get(serverName);
        if (!session) {
            throw new Error(`No active connection to server '${serverName}'`);
        }
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(request.id);
                reject(new Error(`Request timeout for ${request.method}`));
            }, this.options.timeout);
            this.pendingRequests.set(request.id, {
                resolve,
                reject,
                timeout,
            });
            session
                .send(request)
                .catch((error) => {
                clearTimeout(timeout);
                this.pendingRequests.delete(request.id);
                reject(error);
            });
        });
    }
    /**
     * Handle incoming transport messages
     */
    handleMessage(message) {
        try {
            const pending = this.pendingRequests.get(message.id);
            if (!pending) {
                logger_js_1.default.warn(`Received response for unknown request: ${message.id}`);
                return;
            }
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(message.id);
            if (message.error) {
                pending.reject(new Error(`MCP Error: ${message.error.message}`));
            }
            else {
                pending.resolve(message.result);
            }
        }
        catch (error) {
            logger_js_1.default.error('Failed to handle MCP message:', error);
        }
    }
    /**
     * Check if connected to a server
     */
    isConnected(serverName) {
        return this.sessions.has(serverName);
    }
    /**
     * Get connection status for all servers
     */
    getConnectionStatus() {
        const status = {};
        Object.keys(this.servers).forEach((serverName) => {
            status[serverName] = this.isConnected(serverName);
        });
        return status;
    }
}
exports.MCPClient = MCPClient;
// MCP Server Registry - manages server configurations
class MCPServerRegistry {
    servers = {};
    /**
     * Register an MCP server
     */
    register(name, config) {
        this.servers[name] = { ...config, name };
    }
    /**
     * Unregister an MCP server
     */
    unregister(name) {
        delete this.servers[name];
    }
    /**
     * Get server configuration
     */
    getServer(name) {
        return this.servers[name];
    }
    /**
     * List all registered servers
     */
    listServers() {
        return Object.keys(this.servers);
    }
    /**
     * Get all server configurations
     */
    getAllServers() {
        return { ...this.servers };
    }
    /**
     * Find servers that have a specific tool
     */
    findServersWithTool(toolName) {
        return Object.entries(this.servers)
            .filter(([_, config]) => config.tools.some((tool) => tool.name === toolName))
            .map(([name, _]) => name);
    }
}
exports.MCPServerRegistry = MCPServerRegistry;
// Export singleton instances
exports.mcpRegistry = new MCPServerRegistry();
/**
 * Initialize the MCP client with server configurations
 */
function initializeMCPClient(options) {
    exports.mcpClient = new MCPClient(exports.mcpRegistry.getAllServers(), options);
}
/**
 * Convenience function to execute a tool across any server that has it
 */
async function executeToolAnywhere(toolName, args, userScopes) {
    const servers = exports.mcpRegistry.findServersWithTool(toolName);
    if (servers.length === 0) {
        throw new Error(`Tool '${toolName}' not found on any registered server`);
    }
    // Try servers in order until one succeeds
    for (const serverName of servers) {
        try {
            const result = await exports.mcpClient.executeTool(serverName, toolName, args, userScopes);
            return { serverName, result };
        }
        catch (error) {
            console.warn(`Failed to execute ${toolName} on ${serverName}:`, error);
            // Continue to next server
        }
    }
    throw new Error(`Tool '${toolName}' failed on all available servers`);
}
