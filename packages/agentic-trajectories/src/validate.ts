import Ajv, { DefinedError } from 'ajv';
import addFormats from 'ajv-formats';
import { agentTrajectorySchema, AgentTrajectory, SchemaBoundTrajectory } from './schema.js';

export interface ValidationOptions {
    allowedTools?: string[];
    maxTurns?: number;
    maxContentLength?: number;
    allowUnsafeDefaults?: boolean;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

const DEFAULT_ALLOWED_TOOLS = ['bash', 'browser', 'planner', 'retriever', 'npm-test'];
const DEFAULT_MAX_TURNS = 40;
const DEFAULT_MAX_CONTENT_LENGTH = 8000;

const DANGEROUS_BASH_PATTERNS = [
    /rm\s+-rf\s+\/(?![\w])/i,
    /dd\s+if=\/dev\//i,
    /:\(\)\s*\{\s*:\|:\s*;\s*\}\s*;\s*:\?/,
    /curl\s+[^|]+\|\s*(sudo\s+)?sh/i,
    /wget\s+[^|]+\|\s*(sudo\s+)?sh/i,
    /shutdown\s+-/i,
    /mkfs\s+/i
];

function createValidator() {
    const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
    addFormats(ajv);
    return ajv.compile<SchemaBoundTrajectory>(agentTrajectorySchema);
}

const validateSchema = createValidator();

function recordError(errors: string[], message: string) {
    errors.push(message);
}

function isDangerousToolCall(name: string, args: Record<string, unknown>): boolean {
    if (name !== 'bash') return false;
    const script = typeof args?.['command'] === 'string' ? args['command'] : '';
    if (!script) return false;
    return DANGEROUS_BASH_PATTERNS.some((pattern) => pattern.test(script as string));
}

export function validateTrajectory(trajectory: AgentTrajectory, options: ValidationOptions = {}): ValidationResult {
    const errors: string[] = [];
    const allowedTools = options.allowedTools ?? trajectory.meta.allowed_tools ?? DEFAULT_ALLOWED_TOOLS;
    const maxTurns = options.maxTurns ?? DEFAULT_MAX_TURNS;
    const maxContentLength = options.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH;
    const allowUnsafe = options.allowUnsafeDefaults || trajectory.meta.allow_unsafe;

    const schemaValid = validateSchema(trajectory as SchemaBoundTrajectory);
    if (!schemaValid) {
        for (const err of validateSchema.errors as DefinedError[]) {
            errors.push(`${err.instancePath || 'root'} ${err.message}`);
        }
    }

    if (!trajectory.turns || trajectory.turns.length === 0) {
        recordError(errors, 'Trajectory must contain at least one turn');
    }

    if (trajectory.turns.length > maxTurns) {
        recordError(errors, `Trajectory exceeds maximum turn count (${maxTurns})`);
    }

    const seenCallIds = new Set<string>();
    const resultCallIds = new Set<string>();

    trajectory.turns.forEach((turn, idx) => {
        if (turn.content && turn.content.length > maxContentLength) {
            recordError(errors, `Turn ${idx} content exceeds maximum length (${maxContentLength})`);
        }

        const toolCalls = turn.toolCalls || [];
        const toolResults = turn.toolResults || [];

        toolCalls.forEach((call) => {
            if (!allowedTools.includes(call.name)) {
                recordError(errors, `Tool ${call.name} is not in allowlist`);
            }
            if (seenCallIds.has(call.call_id)) {
                recordError(errors, `Duplicate call_id detected: ${call.call_id}`);
            }
            seenCallIds.add(call.call_id);
            if (!allowUnsafe && isDangerousToolCall(call.name, call.arguments)) {
                recordError(errors, `Dangerous bash command blocked for call_id ${call.call_id}`);
            }
        });

        toolResults.forEach((result) => {
            resultCallIds.add(result.call_id);
        });
    });

    for (const resultId of resultCallIds) {
        if (!seenCallIds.has(resultId)) {
            recordError(errors, `Tool result ${resultId} does not match any tool call`);
        }
    }

    const missingResults = new Set([...seenCallIds].filter((id) => !resultCallIds.has(id)));
    missingResults.forEach((id) => recordError(errors, `Tool call ${id} is missing a result`));

    return {
        valid: errors.length === 0,
        errors
    };
}
