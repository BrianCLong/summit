/**
 * Error Handling Utilities
 */

import { EXIT_CODES } from '../lib/constants.js';

export class CLIError extends Error {
  constructor(
    message: string,
    public code: keyof typeof EXIT_CODES = 'GENERAL_ERROR',
    public cause?: Error
  ) {
    super(message);
    this.name = 'CLIError';
  }

  get exitCode(): number {
    return EXIT_CODES[this.code];
  }
}

export class ConnectionError extends CLIError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONNECTION_ERROR', cause);
    this.name = 'ConnectionError';
  }
}

export class AuthenticationError extends CLIError {
  constructor(message: string, cause?: Error) {
    super(message, 'AUTHENTICATION_ERROR', cause);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends CLIError {
  constructor(message: string, cause?: Error) {
    super(message, 'INVALID_ARGUMENT', cause);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends CLIError {
  constructor(message: string, cause?: Error) {
    super(message, 'NOT_FOUND', cause);
    this.name = 'NotFoundError';
  }
}

export class TimeoutError extends CLIError {
  constructor(message: string, cause?: Error) {
    super(message, 'TIMEOUT', cause);
    this.name = 'TimeoutError';
  }
}

export class ExportError extends CLIError {
  constructor(message: string, cause?: Error) {
    super(message, 'EXPORT_ERROR', cause);
    this.name = 'ExportError';
  }
}

export class SyncError extends CLIError {
  constructor(message: string, cause?: Error) {
    super(message, 'SYNC_ERROR', cause);
    this.name = 'SyncError';
  }
}

export function setupErrorHandling(): void {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(EXIT_CODES.GENERAL_ERROR);
  });

  process.on('unhandledRejection', (reason) => {
    console.error(
      'Unhandled rejection:',
      reason instanceof Error ? reason.message : String(reason)
    );
    if (process.env.DEBUG && reason instanceof Error) {
      console.error(reason.stack);
    }
    process.exit(EXIT_CODES.GENERAL_ERROR);
  });

  // Handle SIGINT gracefully
  process.on('SIGINT', () => {
    console.log('\nOperation cancelled');
    process.exit(EXIT_CODES.SUCCESS);
  });

  // Handle SIGTERM gracefully
  process.on('SIGTERM', () => {
    console.log('\nTermination signal received');
    process.exit(EXIT_CODES.SUCCESS);
  });
}

export function handleError(error: unknown): never {
  if (error instanceof CLIError) {
    console.error(`Error: ${error.message}`);
    if (process.env.DEBUG && error.cause) {
      console.error('Caused by:', error.cause.message);
      console.error(error.cause.stack);
    }
    process.exit(error.exitCode);
  }

  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(EXIT_CODES.GENERAL_ERROR);
  }

  console.error('Unknown error:', String(error));
  process.exit(EXIT_CODES.GENERAL_ERROR);
}

export function formatError(error: unknown): string {
  if (error instanceof CLIError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
