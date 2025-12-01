/**
 * CommandBus - Handle and route commands to appropriate handlers
 *
 * Central command bus with validation, middleware, and error handling
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import type {
  Command,
  CommandHandler,
  CommandResult,
  CommandValidator,
  CommandMiddleware,
  CommandHandlerRegistration
} from './types.js';

export class CommandBus extends EventEmitter {
  private handlers: Map<string, CommandHandlerRegistration> = new Map();
  private globalMiddleware: CommandMiddleware[] = [];
  private globalValidators: CommandValidator[] = [];
  private logger: pino.Logger;

  constructor() {
    super();
    this.logger = pino({ name: 'CommandBus' });
  }

  /**
   * Register a command handler
   */
  register(registration: CommandHandlerRegistration): void {
    if (this.handlers.has(registration.commandType)) {
      throw new Error(
        `Handler already registered for command type: ${registration.commandType}`
      );
    }

    this.handlers.set(registration.commandType, registration);

    this.logger.debug(
      { commandType: registration.commandType },
      'Command handler registered'
    );
  }

  /**
   * Register global middleware
   */
  use(middleware: CommandMiddleware): void {
    this.globalMiddleware.push(middleware);
  }

  /**
   * Register global validator
   */
  addValidator(validator: CommandValidator): void {
    this.globalValidators.push(validator);
  }

  /**
   * Execute a command
   */
  async execute<TPayload = any, TResult = any>(
    commandType: string,
    payload: TPayload,
    metadata?: any
  ): Promise<CommandResult<TResult>> {
    const command: Command<TPayload> = {
      commandId: uuidv4(),
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
  async send<T = any>(command: Command): Promise<CommandResult<T>> {
    this.logger.info(
      { commandId: command.commandId, commandType: command.commandType },
      'Processing command'
    );

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
      const result = await this.executeWithMiddleware(
        command,
        registration.handler,
        middleware
      );

      if (result.success) {
        this.emit('command:succeeded', { command, result });
      } else {
        this.emit('command:failed', { command, result });
      }

      return result;
    } catch (err: any) {
      this.logger.error(
        { err, commandId: command.commandId },
        'Command execution error'
      );

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
  private async validateCommand(command: Command): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

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
  private async executeWithMiddleware(
    command: Command,
    handler: CommandHandler,
    middleware: CommandMiddleware[]
  ): Promise<CommandResult> {
    let index = 0;

    const next = async (): Promise<CommandResult> => {
      if (index < middleware.length) {
        const mw = middleware[index++];
        return mw.execute(command, next);
      } else {
        return handler(command);
      }
    };

    return next();
  }

  /**
   * Check if handler exists
   */
  hasHandler(commandType: string): boolean {
    return this.handlers.has(commandType);
  }

  /**
   * Get all registered command types
   */
  getCommandTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}
