import { writeAudit } from "../utils/audit.js";
export function auditLogger(req, res, next) {
    const start = Date.now();
    res.on("finish", () => {
        const userId = req.user?.id;
        writeAudit({
            userId,
            action: `${req.method} ${req.originalUrl}`,
            resourceType: "http",
            details: { status: res.statusCode, durationMs: Date.now() - start },
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
    });
    next();
}
//# sourceMappingURL=audit-logger.js.map