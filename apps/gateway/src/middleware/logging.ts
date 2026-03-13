import { Request, Response, NextFunction } from "express";
import { logger } from "../logger";

export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime();

  res.on("finish", () => {
    // Exclude health checks from access logging
    if (req.path === "/health" || req.path === "/healthz" || req.path === "/api/health") {
      return;
    }

    const diff = process.hrtime(start);
    const durationMs = diff[0] * 1e3 + diff[1] * 1e-6;

    const logData = {
      "http.method": req.method,
      "http.path": req.path,
      "http.status_code": res.statusCode,
      "http.duration_ms": durationMs,
      "http.client_ip": req.ip || "unknown",
      "http.user_agent": req.get("user-agent") || "unknown",
      "http.host": req.get("host") || "unknown",
    };

    if (res.statusCode >= 500) {
      logger.error("HTTP Request Failed", undefined, logData);
    } else if (res.statusCode >= 400) {
      logger.warn("HTTP Request Warning", logData);
    } else {
      logger.info("HTTP Request Completed", logData);
    }
  });

  next();
}
