"use strict";
/**
 * CommandBus - Handle and route commands to appropriate handlers
 *
 * Central command bus with validation, middleware, and error handling
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandBus = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
class CommandBus extends events_1.EventEmitter {
    handlers = new Map();
    globalMiddleware = [];
    globalValidators = [];
    logger;
    constructor() {
        super();
        this.logger = (0, pino_1.default)({ name: 'CommandBus' });
    }
    /**
     * Register a command handler
     */
    register(registration) {
        if (this.handlers.has(registration.commandType)) {
            throw new Error(`Handler already registered for command type: ${registration.commandType}`);
        }
        this.handlers.set(registration.commandType, registration);
        this.logger.debug({ commandType: registration.commandType }, 'Command handler registered');
    }
    /**
     * Register global middleware
     */
    use(middleware) {
        this.globalMiddleware.push(middleware);
    }
    /**
     * Register global validator
     */
    addValidator(validator) {
        this.globalValidators.push(validator);
    }
    /**
     * Execute a command
     */
    async execute(commandType, payload, metadata) {
        const command = {
            commandId: (0, uuid_1.v4)(),
            commandType,
            payload,
            metadata,
            timestamp: new Date()
        };
        return this.send(command);
    }
    /**
     * Send a command for processing
     */
    async send(command) {
        this.logger.info({ commandId: command.commandId, commandType: command.commandType }, 'Processing command');
        this.emit('command:received', command);
        try {
            // Validate command
            const validationResult = await this.validateCommand(command);
            if (!validationResult.valid) {
                const error = validationResult.errors?.join(', ') || 'Validation failed';
                this.emit('command:validation-failed', { command, errors: validationResult.errors });
                return {
                    success: false,
                    error
                };
            }
            // Get handler
            const registration = this.handlers.get(command.commandType);
            if (!registration) {
                const error = `No handler registered for command type: ${command.commandType}`;
                this.emit('command:no-handler', command);
                return {
                    success: false,
                    error
                };
            }
            // Build middleware chain
            const middleware = [
                ...this.globalMiddleware,
                ...(registration.middleware || [])
            ];
            // Execute with middleware
            const result = await this.executeWithMiddleware(command, registration.handler, middleware);
            if (result.success) {
                this.emit('command:succeeded', { command, result });
            }
            else {
                this.emit('command:failed', { command, result });
            }
            return result;
        }
        catch (err) {
            this.logger.error({ err, commandId: command.commandId }, 'Command execution error');
            this.emit('command:error', { command, error: err });
            return {
                success: false,
                error: err.message || 'Command execution failed'
            };
        }
    }
    /**
     * Validate command
     */
    async validateCommand(command) {
        const errors = [];
        // Run global validators
        for (const validator of this.globalValidators) {
            const result = await validator(command);
            if (!result.valid) {
                errors.push(...(result.errors || []));
            }
        }
        // Run command-specific validators
        const registration = this.handlers.get(command.commandType);
        if (registration?.validators) {
            for (const validator of registration.validators) {
                const result = await validator(command);
                if (!result.valid) {
                    errors.push(...(result.errors || []));
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }
    /**
     * Execute command with middleware chain
     */
    async executeWithMiddleware(command, handler, middleware) {
        let index = 0;
        const next = async () => {
            if (index < middleware.length) {
                const mw = middleware[index++];
                return mw.execute(command, next);
            }
            else {
                return handler(command);
            }
        };
        return next();
    }
    /**
     * Check if handler exists
     */
    hasHandler(commandType) {
        return this.handlers.has(commandType);
    }
    /**
     * Get all registered command types
     */
    getCommandTypes() {
        return Array.from(this.handlers.keys());
    }
}
exports.CommandBus = CommandBus;
