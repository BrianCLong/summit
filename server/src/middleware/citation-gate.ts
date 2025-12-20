// @ts-nocheck
import { NextFunction, Request, Response } from 'express';
import { GraphRagResponse } from '../services/graphrag/types.js';
import { isCitationGateEnabled } from '../services/graphrag/citation-gate.js';

export function citationGateContext(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  res.locals.citationGate = isCitationGateEnabled();
  next();
}

export function applyCitationGateStatus(
  response: GraphRagResponse,
  res: Response,
): GraphRagResponse {
  if (!res.locals.citationGate) {
    return response;
  }

  const hasMissing = Boolean(response.citationDiagnostics?.missingCitations);
  const hasDangling = Boolean(response.citationDiagnostics?.danglingCitations);

  if (hasMissing || hasDangling) {
    res.status(422);
  }

  return response;
}
