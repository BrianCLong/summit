import pino from 'pino';

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST;

export const logger = pino({
  name: 'regulatory-compliance-agents',
  level: isTest ? 'silent' : (process.env.LOG_LEVEL || 'info'),
});

export const createAgentLogger = (agentName: string) =>
  logger.child({ agent: agentName });
