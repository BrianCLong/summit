import { v4 as uuid } from 'uuid';
import type { Request, Response, NextFunction } from 'express'; // Added for audit function

// Placeholder for the database connection
const db = {
  query: (query, params) => {
    console.log("Executing query:", query, "with params:", params);
  }
};

export const auditMiddleware = {
  requestDidStart: () => ({
    willSendResponse: ({ response, context }) => {
      if (response.data) {
        const entry = {
          id: uuid(),
          timestamp: new Date().toISOString(),
          actor: (context as any).user?.id,
          action: (response as any).operationName,
          details: JSON.stringify(response.data)
        };
        // Log to Postgres (placeholder)
        db.query('INSERT INTO audit_logs VALUES ($1)', [entry]);
      }
    }
  })
};

export function getAuditChain(id) {
  // Query logs for chain (placeholder)
  console.log("Getting audit chain for id:", id);
  db.query('SELECT * FROM audit_logs WHERE details.id = $1 ORDER BY timestamp', [id]);
  return [];
}

export function audit(req: Request, res: Response, next: NextFunction){
  const start = Date.now();
  res.on('finish', () => {
    const rec = {
      ts: new Date().toISOString(),
      user: (req as any).user?.id,
      path: req.path,
      method: req.method,
      status: res.statusCode,
      reason: (req as any).reason || null,
      ip: req.ip
    };
    console.log(JSON.stringify({ audit: rec }));
  });
  next();
}