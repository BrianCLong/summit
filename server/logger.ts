import pino from 'pino';
export const logger = pino({
  redact: {
    paths: ['req.headers.authorization', 'password', 'ssn', 'card.number', 'email'],
    remove: true
  }
});