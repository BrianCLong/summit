import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyConsentReceipt } from './verifier.js';
import { VerifiableConsentReceipt, VerifyOptions } from './types.js';

export interface ConsentPresentOptions extends VerifyOptions {
  header?: string;
  extract?(req: Request): VerifiableConsentReceipt | undefined;
}

export function consentPresent(options: ConsentPresentOptions): RequestHandler {
  const header = options.header ?? 'x-consent-receipt';

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const receipt = options.extract?.(req) ?? readReceiptFromRequest(req, header);
      if (!receipt) {
        res.status(403).json({ error: 'Consent receipt required' });
        return;
      }
      const result = await verifyConsentReceipt(receipt, options);
      if (!result.verified) {
        res.status(403).json({ error: result.reason ?? 'Consent receipt invalid' });
        return;
      }
      (req as Request & { consentReceipt?: VerifiableConsentReceipt }).consentReceipt = receipt;
      next();
    } catch (error: unknown) {
      next(error);
    }
  };
}

function readReceiptFromRequest(
  req: Request,
  headerName: string,
): VerifiableConsentReceipt | undefined {
  const headerValue = req.headers[headerName.toLowerCase()];
  if (typeof headerValue === 'string') {
    return parseReceipt(headerValue);
  }
  if (Array.isArray(headerValue) && headerValue.length > 0) {
    return parseReceipt(headerValue[0]);
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const receipt = body.consentReceipt || body.consent_receipt;
  if (typeof receipt === 'string') {
    return parseReceipt(receipt);
  }
  if (typeof receipt === 'object' && receipt) {
    return receipt as VerifiableConsentReceipt;
  }
  return undefined;
}

function parseReceipt(value: string): VerifiableConsentReceipt | undefined {
  try {
    return JSON.parse(value) as VerifiableConsentReceipt;
  } catch (error) {
    return undefined;
  }
}
