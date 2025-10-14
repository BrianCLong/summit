import { performance } from "perf_hooks";
import pino from "pino";
const logger = pino({ name: "perfTrace" });
export function perfTrace(req, res, next) {
    const start = performance.now();
    res.on("finish", () => {
        const duration = performance.now() - start;
        logger.info({ path: req.path, duration }, "request completed");
    });
    next();
}
//# sourceMappingURL=perfTrace.js.map