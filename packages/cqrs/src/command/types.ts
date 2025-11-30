/**
 * CQRS Command Types
 */

export interface Command<T = any> {
  commandId: string;
  commandType: string;
  aggregateId?: string;
  payload: T;
  metadata?: CommandMetadata;
  timestamp: Date;
}

export interface CommandMetadata {
  userId?: string;
  correlationId?: string;
  causationId?: string;
  traceId?: string;
  source?: string;
  [key: string]: any;
}

export interface CommandResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  events?: any[];
  version?: number;
}

export type CommandHandler<TCommand = any, TResult = any> = (
  command: Command<TCommand>
) => Promise<CommandResult<TResult>>;

export interface CommandValidationResult {
  valid: boolean;
  errors?: string[];
}

export type CommandValidator<T = any> = (
  command: Command<T>
) => Promise<CommandValidationResult> | CommandValidationResult;

export interface CommandMiddleware {
  execute: (
    command: Command,
    next: () => Promise<CommandResult>
  ) => Promise<CommandResult>;
}

export interface CommandHandlerRegistration {
  commandType: string;
  handler: CommandHandler;
  validators?: CommandValidator[];
  middleware?: CommandMiddleware[];
}
