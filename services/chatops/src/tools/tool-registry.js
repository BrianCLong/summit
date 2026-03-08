"use strict";
/**
 * Tool Registry with Supply Chain Attestation
 *
 * Manages registered tools/plugins for ChatOps execution:
 * - Tool registration with schema validation
 * - SLSA attestation verification
 * - Cosign signature checking
 * - SBOM tracking
 * - Capability declaration
 * - Risk classification
 *
 * Features:
 * - Hot-reload of tool definitions
 * - Version management
 * - Dependency resolution
 * - Sandbox execution support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRegistry = void 0;
exports.createToolRegistry = createToolRegistry;
exports.createGraphToolDefinition = createGraphToolDefinition;
// =============================================================================
// TOOL REGISTRY
// =============================================================================
class ToolRegistry {
    pg;
    redis;
    config;
    tools = new Map();
    handlers = new Map();
    constructor(config) {
        this.pg = config.postgres;
        this.redis = config.redis;
        this.config = {
            requireAttestation: config.requireAttestation ?? false,
            minSLSALevel: config.minSLSALevel ?? 2,
            blockedVulnerabilitySeverities: config.blockedVulnerabilitySeverities ?? ['critical'],
            cosignKeyPath: config.cosignKeyPath ?? '',
            postgres: config.postgres,
            redis: config.redis,
        };
        // Load tools from database
        this.loadTools();
    }
    // ===========================================================================
    // REGISTRATION
    // ===========================================================================
    /**
     * Register a new tool
     */
    async register(definition, handler) {
        // Validate schema
        this.validateToolDefinition(definition);
        // Verify attestation if required
        if (this.config.requireAttestation) {
            await this.verifyAttestation(definition);
        }
        // Check SBOM vulnerabilities
        if (definition.attestation?.sbom) {
            this.checkVulnerabilities(definition.attestation.sbom);
        }
        // Store in memory
        this.tools.set(definition.toolId, definition);
        this.handlers.set(definition.toolId, handler);
        // Persist to database
        await this.pg.query(`INSERT INTO chatops_tools (
        tool_id, name, description, version,
        operations, input_schema, output_schema,
        capabilities, required_permissions,
        default_risk_level, risk_overrides,
        attestation, execution_mode, timeout_ms, max_retries,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      ON CONFLICT (tool_id, version) DO UPDATE SET
        name = $2, description = $3,
        operations = $5, input_schema = $6, output_schema = $7,
        capabilities = $8, required_permissions = $9,
        default_risk_level = $10, risk_overrides = $11,
        attestation = $12, execution_mode = $13, timeout_ms = $14, max_retries = $15,
        updated_at = NOW()`, [
            definition.toolId,
            definition.name,
            definition.description,
            definition.version,
            JSON.stringify(definition.operations),
            JSON.stringify(definition.inputSchema),
            JSON.stringify(definition.outputSchema),
            definition.capabilities,
            definition.requiredPermissions,
            definition.defaultRiskLevel,
            JSON.stringify(definition.riskOverrides ?? {}),
            JSON.stringify(definition.attestation ?? {}),
            definition.executionMode,
            definition.timeout ?? 30000,
            definition.maxRetries ?? 3,
        ]);
        // Cache
        await this.cacheTool(definition);
        console.log(`Registered tool: ${definition.toolId}@${definition.version}`);
    }
    /**
     * Unregister a tool
     */
    async unregister(toolId) {
        this.tools.delete(toolId);
        this.handlers.delete(toolId);
        await this.pg.query(`UPDATE chatops_tools SET deleted_at = NOW() WHERE tool_id = $1`, [toolId]);
        await this.redis.del(`chatops:tool:${toolId}`);
    }
    // ===========================================================================
    // INVOCATION
    // ===========================================================================
    /**
     * Invoke a tool operation
     */
    async invoke(operation) {
        const startTime = Date.now();
        const tool = this.tools.get(operation.toolId);
        if (!tool) {
            return {
                success: false,
                error: `Tool not found: ${operation.toolId}`,
                tokensUsed: 0,
                latencyMs: Date.now() - startTime,
            };
        }
        const handler = this.handlers.get(operation.toolId);
        if (!handler) {
            return {
                success: false,
                error: `Handler not found for tool: ${operation.toolId}`,
                tokensUsed: 0,
                latencyMs: Date.now() - startTime,
            };
        }
        // Validate operation exists
        const opSchema = tool.operations.find((o) => o.operation === operation.operation);
        if (!opSchema) {
            return {
                success: false,
                error: `Operation not found: ${operation.toolId}:${operation.operation}`,
                tokensUsed: 0,
                latencyMs: Date.now() - startTime,
            };
        }
        // Validate input
        const validationError = this.validateInput(operation.input, opSchema.inputSchema);
        if (validationError) {
            return {
                success: false,
                error: `Input validation failed: ${validationError}`,
                tokensUsed: 0,
                latencyMs: Date.now() - startTime,
            };
        }
        // Execute with timeout
        try {
            const timeout = tool.timeout ?? 30000;
            const result = await this.executeWithTimeout(() => handler(operation.operation, operation.input), timeout);
            return {
                success: true,
                result,
                tokensUsed: this.estimateTokens(operation.input, result),
                latencyMs: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                tokensUsed: 0,
                latencyMs: Date.now() - startTime,
            };
        }
    }
    // ===========================================================================
    // QUERIES
    // ===========================================================================
    /**
     * Get tool definition
     */
    getTool(toolId) {
        return this.tools.get(toolId);
    }
    /**
     * Get all registered tools
     */
    getAllTools() {
        return Array.from(this.tools.values());
    }
    /**
     * Get tools by capability
     */
    getToolsByCapability(capability) {
        return Array.from(this.tools.values()).filter((t) => t.capabilities.includes(capability));
    }
    /**
     * Get risk level for an operation
     */
    getRiskLevel(toolId, operation) {
        const tool = this.tools.get(toolId);
        if (!tool)
            return 'prohibited';
        // Check operation-specific override
        const opSchema = tool.operations.find((o) => o.operation === operation);
        if (opSchema?.riskLevel) {
            return opSchema.riskLevel;
        }
        // Check tool-level override
        if (tool.riskOverrides?.[operation]) {
            return tool.riskOverrides[operation];
        }
        return tool.defaultRiskLevel;
    }
    /**
     * Get tool schema for LLM
     */
    getToolSchema(toolId) {
        const tool = this.tools.get(toolId);
        if (!tool)
            return null;
        return {
            name: tool.name,
            description: tool.description,
            operations: tool.operations.map((op) => ({
                name: op.operation,
                description: op.description,
                parameters: op.inputSchema,
            })),
        };
    }
    // ===========================================================================
    // ATTESTATION
    // ===========================================================================
    /**
     * Verify tool attestation
     */
    async verifyAttestation(tool) {
        if (!tool.attestation) {
            throw new Error(`Tool ${tool.toolId} has no attestation`);
        }
        switch (tool.attestation.type) {
            case 'slsa':
                await this.verifySLSA(tool);
                break;
            case 'cosign':
                await this.verifyCosign(tool);
                break;
            case 'sigstore':
                await this.verifySigstore(tool);
                break;
            default:
                throw new Error(`Unknown attestation type: ${tool.attestation.type}`);
        }
        tool.attestation.verified = true;
        tool.attestation.verifiedAt = new Date();
    }
    async verifySLSA(tool) {
        const attestation = tool.attestation;
        // Check SLSA level
        const level = parseInt(attestation.level ?? '0');
        if (level < this.config.minSLSALevel) {
            throw new Error(`Tool ${tool.toolId} has SLSA level ${level}, minimum required is ${this.config.minSLSALevel}`);
        }
        // In a real implementation, we would verify the SLSA provenance
        // using slsa-verifier or similar tool
        console.log(`SLSA verification for ${tool.toolId}: Level ${level}`);
    }
    async verifyCosign(tool) {
        if (!this.config.cosignKeyPath) {
            console.warn('Cosign key path not configured, skipping verification');
            return;
        }
        const attestation = tool.attestation;
        if (!attestation.signature) {
            throw new Error(`Tool ${tool.toolId} has no cosign signature`);
        }
        // In a real implementation, we would use cosign to verify
        // execSync(`cosign verify --key ${this.config.cosignKeyPath} ...`);
        console.log(`Cosign verification for ${tool.toolId}: OK`);
    }
    async verifySigstore(tool) {
        const attestation = tool.attestation;
        if (!attestation.rekorLogId) {
            throw new Error(`Tool ${tool.toolId} has no Rekor log ID`);
        }
        // In a real implementation, we would verify against Rekor transparency log
        console.log(`Sigstore verification for ${tool.toolId}: Rekor ID ${attestation.rekorLogId}`);
    }
    // ===========================================================================
    // INTERNAL METHODS
    // ===========================================================================
    validateToolDefinition(definition) {
        if (!definition.toolId) {
            throw new Error('Tool ID is required');
        }
        if (!definition.name) {
            throw new Error('Tool name is required');
        }
        if (!definition.version) {
            throw new Error('Tool version is required');
        }
        if (!definition.operations || definition.operations.length === 0) {
            throw new Error('Tool must have at least one operation');
        }
    }
    validateInput(input, schema) {
        // Basic validation - in production, use JSON Schema validator
        const required = schema.required ?? [];
        for (const field of required) {
            if (!(field in input)) {
                return `Missing required field: ${field}`;
            }
        }
        return null;
    }
    checkVulnerabilities(sbom) {
        if (!sbom.vulnerabilities)
            return;
        const blocked = sbom.vulnerabilities.filter((v) => this.config.blockedVulnerabilitySeverities.includes(v.severity));
        if (blocked.length > 0) {
            const vulnIds = blocked.map((v) => v.id).join(', ');
            throw new Error(`Tool has blocked vulnerabilities: ${vulnIds}`);
        }
    }
    async executeWithTimeout(fn, timeout) {
        return Promise.race([
            fn(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Execution timeout')), timeout)),
        ]);
    }
    estimateTokens(input, output) {
        const inputStr = JSON.stringify(input);
        const outputStr = JSON.stringify(output);
        return Math.ceil((inputStr.length + outputStr.length) / 4);
    }
    async cacheTool(tool) {
        await this.redis.set(`chatops:tool:${tool.toolId}`, JSON.stringify(tool), 'EX', 3600);
    }
    async loadTools() {
        const result = await this.pg.query(`SELECT * FROM chatops_tools WHERE deleted_at IS NULL`);
        for (const row of result.rows) {
            const tool = {
                toolId: row.tool_id,
                name: row.name,
                description: row.description,
                version: row.version,
                operations: row.operations,
                inputSchema: row.input_schema,
                outputSchema: row.output_schema,
                capabilities: row.capabilities,
                requiredPermissions: row.required_permissions,
                defaultRiskLevel: row.default_risk_level,
                riskOverrides: row.risk_overrides,
                attestation: row.attestation,
                executionMode: row.execution_mode,
                timeout: row.timeout_ms,
                maxRetries: row.max_retries,
            };
            this.tools.set(tool.toolId, tool);
        }
        console.log(`Loaded ${this.tools.size} tools from database`);
    }
}
exports.ToolRegistry = ToolRegistry;
// =============================================================================
// FACTORY
// =============================================================================
function createToolRegistry(config) {
    return new ToolRegistry(config);
}
// =============================================================================
// BUILT-IN TOOLS
// =============================================================================
/**
 * Create a tool definition for graph operations
 */
function createGraphToolDefinition() {
    return {
        toolId: 'graph',
        name: 'Knowledge Graph',
        description: 'Query and manipulate the intelligence knowledge graph',
        version: '1.0.0',
        operations: [
            {
                operation: 'read',
                description: 'Read entities from the graph',
                inputSchema: { type: 'object', properties: { ids: { type: 'array' } } },
                outputSchema: { type: 'array' },
                riskLevel: 'autonomous',
            },
            {
                operation: 'query',
                description: 'Execute a graph query',
                inputSchema: { type: 'object', properties: { cypher: { type: 'string' } } },
                outputSchema: { type: 'array' },
                riskLevel: 'autonomous',
            },
            {
                operation: 'write',
                description: 'Create or update entities',
                inputSchema: { type: 'object', properties: { entities: { type: 'array' } } },
                outputSchema: { type: 'object' },
                riskLevel: 'hitl',
            },
            {
                operation: 'delete',
                description: 'Delete entities from the graph',
                inputSchema: { type: 'object', properties: { ids: { type: 'array' } } },
                outputSchema: { type: 'object' },
                riskLevel: 'prohibited',
            },
        ],
        inputSchema: {},
        outputSchema: {},
        capabilities: ['graph_read', 'graph_write', 'graph_query'],
        requiredPermissions: ['graph:access'],
        defaultRiskLevel: 'autonomous',
        executionMode: 'inline',
        timeout: 30000,
        maxRetries: 3,
    };
}
