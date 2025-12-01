import pino from 'pino';

export const logger = pino({
  name: 'regulatory-compliance-agents',
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

export const createAgentLogger = (agentName: string) =>
  logger.child({ agent: agentName });
