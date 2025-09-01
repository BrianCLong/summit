import fs from 'fs';
import path from 'path';
const logDir = process.env.AUDIT_LOG_DIR
    ? path.resolve(process.env.AUDIT_LOG_DIR)
    : path.join(__dirname, '..', 'logs');
const logFile = path.join(logDir, 'audit.log');
async function ensureDir() {
    try {
        await fs.promises.mkdir(logDir, { recursive: true });
    }
    catch {
        // ignore
    }
}
export default function auditLogger(req, res, next) {
    const start = Date.now();
    res.on('finish', async () => {
        const entry = {
            time: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            ip: req.ip,
            user: req.user?.id || 'anonymous',
            responseTime: Date.now() - start,
        };
        try {
            await ensureDir();
            await fs.promises.appendFile(logFile, JSON.stringify(entry) + '\n');
        }
        catch (err) {
            console.error('audit log write failed', err);
        }
    });
    next();
}
//# sourceMappingURL=auditLogger.js.map