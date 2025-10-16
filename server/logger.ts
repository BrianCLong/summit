import pino from 'pino';
export const logger = pino({
  redact: {
    paths: [
      'req.headers.authorization',
      'password',
      'ssn',
      'card.number',
      'email',
    ],
    remove: true,
  },
});

let rate = Number(process.env.LOG_SAMPLE_RATE || '1.0');
export function maybeLog(level: 'info' | 'warn' | 'error', obj: any) {
  if (level === 'error' || Math.random() < rate) logger[level](obj);
}
