export interface LogContext {
  tenantId?: string;
  correlationId?: string;
  serviceName?: string;
  [key: string]: any;
}

export class StructuredLogger {
  constructor(private serviceName: string) {}

  info(message: string, context: LogContext = {}) {
    this.log('INFO', message, context);
  }

  error(message: string, context: LogContext = {}) {
    this.log('ERROR', message, context);
  }

  warn(message: string, context: LogContext = {}) {
    this.log('WARN', message, context);
  }

  debug(message: string, context: LogContext = {}) {
    this.log('DEBUG', message, context);
  }

  private log(severity: string, message: string, context: LogContext) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      severity,
      serviceName: this.serviceName,
      message,
      ...context
    }));
  }
}
