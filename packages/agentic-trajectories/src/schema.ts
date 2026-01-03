import { JSONSchemaType } from 'ajv';

export type AgentRole = 'user' | 'assistant' | 'expert';

export interface ToolCall {
    name: string;
    arguments: Record<string, unknown>;
    call_id: string;
    ts: string;
}

export interface ToolResult {
    call_id: string;
    ok: boolean;
    stdout?: string;
    stderr?: string;
    artifacts?: unknown;
    ts: string;
}

export interface Turn {
    role: AgentRole;
    content?: string;
    plan?: string;
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
    reflection?: string;
    errors?: string[];
}

export interface AgentTrajectoryMeta {
    schema_version: string;
    generator_version: string;
    task_type?: string;
    created_at?: string;
    allow_unsafe?: boolean;
    allowed_tools?: string[];
    notes?: string;
}

export interface AgentTrajectory {
    id: string;
    meta: AgentTrajectoryMeta;
    turns: Turn[];
}

export interface SchemaBoundTrajectory extends AgentTrajectory {
    meta: AgentTrajectoryMeta & { schema_version: string; generator_version: string };
}

export const agentTrajectorySchema: JSONSchemaType<SchemaBoundTrajectory> = {
    $id: 'https://intelgraph/schemas/agentic-trajectory.json',
    type: 'object',
    properties: {
        id: { type: 'string', minLength: 1 },
        meta: {
            type: 'object',
            properties: {
                schema_version: { type: 'string', minLength: 1 },
                generator_version: { type: 'string', minLength: 1 },
                task_type: { type: 'string', nullable: true, minLength: 1 },
                created_at: { type: 'string', nullable: true },
                allow_unsafe: { type: 'boolean', nullable: true },
                allowed_tools: {
                    type: 'array',
                    items: { type: 'string' },
                    nullable: true,
                    uniqueItems: true
                },
                notes: { type: 'string', nullable: true }
            },
            required: ['schema_version', 'generator_version'],
            additionalProperties: false
        },
        turns: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                properties: {
                    role: { type: 'string', enum: ['user', 'assistant', 'expert'] },
                    content: { type: 'string', nullable: true },
                    plan: { type: 'string', nullable: true },
                    toolCalls: {
                        type: 'array',
                        nullable: true,
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                arguments: { type: 'object', nullable: false },
                                call_id: { type: 'string' },
                                ts: { type: 'string' }
                            },
                            required: ['name', 'arguments', 'call_id', 'ts'],
                            additionalProperties: false
                        },
                        default: []
                    },
                    toolResults: {
                        type: 'array',
                        nullable: true,
                        items: {
                            type: 'object',
                            properties: {
                                call_id: { type: 'string' },
                                ok: { type: 'boolean' },
                                stdout: { type: 'string', nullable: true },
                                stderr: { type: 'string', nullable: true },
                                artifacts: { type: 'object', nullable: true },
                                ts: { type: 'string' }
                            },
                            required: ['call_id', 'ok', 'ts'],
                            additionalProperties: false
                        },
                        default: []
                    },
                    reflection: { type: 'string', nullable: true },
                    errors: {
                        type: 'array',
                        nullable: true,
                        items: { type: 'string' }
                    }
                },
                required: ['role'],
                additionalProperties: false
            }
        }
    },
    required: ['id', 'meta', 'turns'],
    additionalProperties: false
} as unknown as JSONSchemaType<SchemaBoundTrajectory>;

export const DEFAULT_SCHEMA_VERSION = '1.0.0';
export const GENERATOR_VERSION = '0.1.0';
