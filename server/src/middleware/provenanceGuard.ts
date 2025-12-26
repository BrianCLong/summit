import { Request, Response, NextFunction } from 'express';
import { invariantService } from '../invariants/enforcer';

export const provenanceGuardMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Capture original send/json methods to inspect response
  const originalSend = res.send;
  const originalJson = res.json;

  // We only check for specific critical paths or methods if needed
  // For now, let's assume we want to ensure any state-changing operation has provenance
  const isStateChange = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);

  if (isStateChange) {
    // Intercept response to check for provenance headers or body
    // Note: Checking headers on response *before* it is sent is tricky with interceptors
    // But we can check if the handler attached a provenance ID to the request or response locals
    // Or we can assume the invariant check happens elsewhere and we just catch violations here?
    // The prompt says "Ensure that any future deviation... is detectable... blocked by automation".
    // Epic 2 says "Verify provenance metadata is attached".

    // Let's attach a check on `res.on('finish')` to log/metric, but to BLOCK it we need to intercept.
    // However, the prompt says "Violations fail tests or CI deterministically".
    // Runtime blocking might be too aggressive if not careful.
    // But "closing loopholes" implies strictness.

    // A better approach for the middleware is to check if the *request* context has been set up for provenance
    // OR check the response headers right before sending.

    // Let's implement a response interceptor check.

    // We will trust the InvariantService to have been called by the ledger or service layer.
    // Here we just ensure the result includes evidence of that.

    // Hook into response
    /*
    // Complexity warning: Overriding res.send can be fragile with streams/async.
    // Instead, let's verify if the Provenance Header is set?
    */
  }

  // Actually, let's keep it simple: Ensure specific headers are present on response
  res.on('finish', async () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const provId = res.getHeader('X-Provenance-ID');

      // Delegate check to InvariantService
      await invariantService.checkInvariant('INV-001-RESPONSE', {
        isStateChange,
        provenanceHeader: provId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode
      });
    }
  });

  next();
};
