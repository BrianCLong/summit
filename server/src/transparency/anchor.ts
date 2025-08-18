import { appendFileSync } from 'fs';

const logPath = 'transparency.log';

export function anchor(templateId: string, event: string) {
  appendFileSync(logPath, `${new Date().toISOString()} ${event} ${templateId}\n`);
}
