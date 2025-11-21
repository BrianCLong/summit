import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware
 */
export class RequestLogger {
  private static logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({
        filename: 'logs/gateway-error.log',
        level: 'error',
      }),
      new winston.transports.File({
        filename: 'logs/gateway-combined.log',
      }),
    ],
  });

  /**
   * Request logging middleware
   */
  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();

      // Add request ID to request and response
      (req as any).requestId = requestId;
      res.setHeader('X-Request-ID', requestId);

      // Log request
      this.logger.info('Incoming request', {
        requestId,
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        pluginId: req.params.pluginId,
      });

      // Capture response
      const originalSend = res.send.bind(res);
      res.send = (body: any) => {
        const duration = Date.now() - startTime;

        // Log response
        this.logger.info('Response sent', {
          requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          pluginId: req.params.pluginId,
        });

        return originalSend(body);
      };

      // Handle errors
      res.on('error', (error) => {
        this.logger.error('Response error', {
          requestId,
          method: req.method,
          path: req.path,
          error: error.message,
          pluginId: req.params.pluginId,
        });
      });

      next();
    };
  }

  /**
   * Log plugin-specific events
   */
  static logPluginEvent(pluginId: string, event: string, data: any) {
    this.logger.info('Plugin event', {
      pluginId,
      event,
      data,
    });
  }

  /**
   * Log errors
   */
  static logError(error: Error, context?: any) {
    this.logger.error('Error', {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  }

  /**
   * Generate unique request ID
   */
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
