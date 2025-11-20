import type { NextFunction, Request, Response } from 'express';

type FetchLike = typeof fetch;

export interface ResourceUsage {
  cpuSeconds: number;
  ramGbHours: number;
  ioGb: number;
  egressGb: number;
}

export interface EstimateBreakdown {
  cpuUsd: number;
  ramUsd: number;
  ioUsd: number;
  egressUsd: number;
}

export interface EstimatePayload {
  costUsd: number;
  carbonKg: number;
  energyKwh: number;
  breakdown: EstimateBreakdown;
  modelVersion: string;
  errorMargin: number;
}

export interface ActualDelta {
  costUsd: number;
  carbonKg: number;
}

export interface ActualPayload {
  costUsd: number;
  carbonKg: number;
  energyKwh: number;
  breakdown: EstimateBreakdown;
  usage: ResourceUsage;
  delta: ActualDelta;
}

export interface JobRecordResponse {
  jobId: string;
  region: string;
  resources: ResourceUsage;
  projected: EstimatePayload;
  actual?: ActualPayload;
}

export interface BudgetDecision {
  jobId: string;
  region: string;
  budgetUsd: number;
  projectedUsd: number;
  projectedCarbonKg: number;
  allowed: boolean;
  marginUsd: number;
  modelVersion: string;
  errorMargin: number;
}

export interface JobEnvelope {
  jobId: string;
  region: string;
  resources: ResourceUsage;
  actualResources?: ResourceUsage;
}

export interface Q3CClientOptions {
  baseUrl?: string;
  fetchImpl?: FetchLike;
}

export interface BudgetCheckRequest extends JobEnvelope {
  budgetUsd: number;
}

export interface AnnotationOptions {
  extractor?: (req: Request) => JobEnvelope | null;
  actualExtractor?: (req: Request) => ResourceUsage | null;
  attach?: (req: Request, annotation: Q3CAnnotation) => void;
}

export interface BudgetGuardOptions {
  extractor?: (req: Request) => JobEnvelope | null;
  getBudget: (req: Request) => number | null | undefined;
  onDeny?: (req: Request, res: Response, decision: BudgetDecision) => void;
}

export interface Q3CAnnotation {
  job: JobEnvelope;
  projected: JobRecordResponse;
  actual?: JobRecordResponse;
  budgetDecision?: BudgetDecision;
}

export class Q3CClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: Q3CClientOptions = {}) {
    this.baseUrl = (
      options.baseUrl ??
      process.env.Q3C_URL ??
      'http://localhost:8080'
    ).replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async estimate(envelope: JobEnvelope): Promise<JobRecordResponse> {
    const { payload } = await this.request<JobRecordResponse>(
      '/v1/estimate',
      {
        jobId: envelope.jobId,
        region: envelope.region,
        resources: envelope.resources,
      },
      [200],
    );
    return payload;
  }

  async submitActual(
    envelope: JobEnvelope,
    actual: ResourceUsage,
  ): Promise<JobRecordResponse> {
    const { payload } = await this.request<JobRecordResponse>(
      '/v1/actual',
      {
        jobId: envelope.jobId,
        region: envelope.region,
        resources: actual,
      },
      [200],
    );
    return payload;
  }

  async checkBudget(request: BudgetCheckRequest): Promise<BudgetDecision> {
    const { status, payload } = await this.request<
      | BudgetDecision
      | { projection: JobRecordResponse; budgetCheckResponse: BudgetDecision }
    >(
      '/v1/budget/check',
      {
        jobId: request.jobId,
        region: request.region,
        resources: request.resources,
        budgetUsd: request.budgetUsd,
      },
      [200, 403],
    );

    if (status === 200) {
      const successPayload = payload as {
        projection: JobRecordResponse;
        budgetCheckResponse: BudgetDecision;
      };
      return { ...successPayload.budgetCheckResponse, allowed: true };
    }

    const denied = payload as BudgetDecision;
    return { ...denied, allowed: false };
  }

  private async request<T>(
    path: string,
    body: unknown,
    acceptedStatuses: number[],
  ): Promise<{ status: number; payload: T }> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let payload: T;
    try {
      payload = text ? (JSON.parse(text) as T) : ({} as T);
    } catch (error) {
      if (!acceptedStatuses.includes(response.status)) {
        throw new Error(
          `q3c request failed (${response.status}): ${text || response.statusText}`,
        );
      }
      throw error;
    }

    if (!acceptedStatuses.includes(response.status)) {
      throw new Error(
        `q3c request failed (${response.status}): ${text || response.statusText}`,
      );
    }

    return { status: response.status, payload };
  }
}

const defaultExtractor = (req: Request): JobEnvelope | null => {
  const body = req.body as
    | Partial<JobEnvelope & { jobId?: string }>
    | undefined;
  if (!body || !body.jobId || !body.region || !body.resources) {
    return null;
  }
  return {
    jobId: body.jobId,
    region: body.region,
    resources: body.resources as ResourceUsage,
    actualResources: (body as JobEnvelope).actualResources,
  };
};

const defaultAttach = (req: Request, annotation: Q3CAnnotation) => {
  (req as Request & { q3c?: Q3CAnnotation }).q3c = annotation;
};

export function createQ3CAnnotationMiddleware(
  client: Q3CClient,
  options: AnnotationOptions = {},
) {
  const extractor = options.extractor ?? defaultExtractor;
  const attach = options.attach ?? defaultAttach;

  return async (req: Request, _res: Response, next: NextFunction) => {
    const job = extractor(req);
    if (!job) {
      return next();
    }

    try {
      const projected = await client.estimate(job);
      const annotation: Q3CAnnotation = {
        job,
        projected,
      };

      const actualResources =
        options.actualExtractor?.(req) ?? job.actualResources;
      if (actualResources) {
        annotation.actual = await client.submitActual(job, actualResources);
      }

      attach(req, annotation);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function createQ3CBudgetGuard(
  client: Q3CClient,
  options: BudgetGuardOptions,
) {
  const extractor = options.extractor ?? defaultExtractor;

  return async (req: Request, res: Response, next: NextFunction) => {
    const job = extractor(req);
    if (!job) {
      return next();
    }

    const budget = options.getBudget(req);
    if (budget == null || Number.isNaN(budget)) {
      return next();
    }

    try {
      const decision = await client.checkBudget({ ...job, budgetUsd: budget });
      if (!decision.allowed) {
        if (options.onDeny) {
          options.onDeny(req, res, decision);
        } else {
          res.status(403).json({
            error: 'budget_exceeded',
            jobId: decision.jobId,
            budgetUsd: decision.budgetUsd,
            projectedUsd: decision.projectedUsd,
            marginUsd: decision.marginUsd,
          });
        }
        return;
      }

      const existing = (req as Request & { q3c?: Q3CAnnotation }).q3c;
      if (existing) {
        existing.budgetDecision = decision;
      } else {
        (req as Request & { q3c?: Q3CAnnotation }).q3c = {
          job,
          projected: await client.estimate(job),
          budgetDecision: decision,
        };
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
