import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { parse, type OperationDefinitionNode } from 'graphql';
import { decodeProgram } from './bytecode.js';
import { simulate } from './simulator.js';
import type { PolicyProgram, SimulationContext, SimulationResult } from './types.js';

export interface EnforcerOptions {
  program?: PolicyProgram;
  extractLicenses?: (req: Request) => string[];
  extractWarrants?: (req: Request) => string[];
  extractJurisdiction?: (req: Request) => string | undefined;
  extractRetentionDays?: (req: Request) => number | null | undefined;
  onDecision?: (decision: SimulationResult, req: Request, res: Response) => void;
}

const DEFAULT_OPTIONS: Required<Omit<EnforcerOptions, 'program' | 'onDecision'>> = {
  extractLicenses: req => {
    const header = req.headers['x-licenses'];
    if (!header) {
      return [];
    }
    return String(header)
      .split(',')
      .map(token => token.trim())
      .filter(Boolean);
  },
  extractWarrants: req => {
    const header = req.headers['x-warrants'];
    if (!header) {
      return [];
    }
    return String(header)
      .split(',')
      .map(token => token.trim())
      .filter(Boolean);
  },
  extractJurisdiction: req => {
    const header = req.headers['x-jurisdiction'];
    return header ? String(header).trim() : undefined;
  },
  extractRetentionDays: req => {
    const header = req.headers['x-retention-days'];
    if (header == null) {
      return null;
    }
    const value = Number(header);
    return Number.isNaN(value) ? null : value;
  },
};

function resolveOperation(req: Request): { operationName: string; operationType: 'query' | 'mutation' | 'subscription' } {
  const body: any = req.body ?? {};
  const rawQuery: string | undefined = body.query;
  const operationNameFromRequest: string | undefined = body.operationName;
  if (!rawQuery) {
    return {
      operationName: operationNameFromRequest ?? 'anonymous',
      operationType: 'query',
    };
  }
  try {
    const document = parse(rawQuery);
    const definitions = document.definitions.filter(
      def => def.kind === 'OperationDefinition',
    ) as OperationDefinitionNode[];
    const matched = operationNameFromRequest
      ? definitions.find(def => def.name?.value === operationNameFromRequest)
      : definitions[0];
    if (!matched) {
      return {
        operationName: operationNameFromRequest ?? 'anonymous',
        operationType: 'query',
      };
    }
    return {
      operationName: matched.name?.value ?? operationNameFromRequest ?? 'anonymous',
      operationType: matched.operation,
    };
  } catch (error) {
    return {
      operationName: operationNameFromRequest ?? 'anonymous',
      operationType: 'query',
    };
  }
}

function buildSimulationContext(req: Request, options: Required<typeof DEFAULT_OPTIONS>): SimulationContext {
  const { operationName, operationType } = resolveOperation(req);
  return {
    operationName,
    operationType,
    licenses: options.extractLicenses(req),
    warrants: options.extractWarrants(req),
    jurisdiction: options.extractJurisdiction(req),
    retentionDays: options.extractRetentionDays(req),
  };
}

function annotateResponse(res: Response, result: SimulationResult) {
  res.setHeader('x-legal-basis', result.legalBasis ?? 'N/A');
  res.setHeader('x-lac-status', result.status);
  res.setHeader('x-lac-rule', result.ruleId ?? 'none');
}

function toMiddlewareDecision(
  res: Response,
  result: SimulationResult,
  onDecision?: (decision: SimulationResult, req: Request, res: Response) => void,
  req?: Request,
) {
  annotateResponse(res, result);
  if (onDecision && req) {
    onDecision(result, req, res);
  }
  if (result.status === 'block') {
    res.status(403).json({
      error: 'POLICY_VIOLATION',
      legalBasis: result.legalBasis,
      reasons: result.reasons,
      diff: result.diff,
      appealHint: result.appealHint,
      annotations: result.annotations,
    });
  }
}

export function createLacMiddleware(bytecode: Buffer, options: EnforcerOptions = {}): RequestHandler {
  const program: PolicyProgram = options.program ?? decodeProgram(bytecode);
  const extractorOptions = {
    ...DEFAULT_OPTIONS,
    extractLicenses: options.extractLicenses ?? DEFAULT_OPTIONS.extractLicenses,
    extractWarrants: options.extractWarrants ?? DEFAULT_OPTIONS.extractWarrants,
    extractJurisdiction: options.extractJurisdiction ?? DEFAULT_OPTIONS.extractJurisdiction,
    extractRetentionDays: options.extractRetentionDays ?? DEFAULT_OPTIONS.extractRetentionDays,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const context = buildSimulationContext(req, extractorOptions);
    const result = simulate(program, context);
    (req as any).lacDecision = result;
    if (result.status === 'block') {
      toMiddlewareDecision(res, result, options.onDecision, req);
      return;
    }
    annotateResponse(res, result);
    if (options.onDecision) {
      options.onDecision(result, req, res);
    }
    next();
  };
}

export function evaluateRequest(program: PolicyProgram, req: Request, options: EnforcerOptions = {}) {
  const extractorOptions = {
    ...DEFAULT_OPTIONS,
    extractLicenses: options.extractLicenses ?? DEFAULT_OPTIONS.extractLicenses,
    extractWarrants: options.extractWarrants ?? DEFAULT_OPTIONS.extractWarrants,
    extractJurisdiction: options.extractJurisdiction ?? DEFAULT_OPTIONS.extractJurisdiction,
    extractRetentionDays: options.extractRetentionDays ?? DEFAULT_OPTIONS.extractRetentionDays,
  };
  const context = buildSimulationContext(req, extractorOptions);
  return simulate(program, context);
}
