import { appendFileSync } from 'fs';
const logPath = 'transparency.log';
export function anchor(templateId, event) {
    appendFileSync(logPath, `${new Date().toISOString()} ${event} ${templateId}\n`);
}
//# sourceMappingURL=anchor.js.map