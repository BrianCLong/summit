import {
  TaskOperation,
  TaskPatch,
  TaskSearchFilters,
  TaskSpec,
  TaskStorePolicyConfig,
  TaskUpdatePreconditions,
} from './types.js';

export class PolicyError extends Error {
  readonly code: string;

  constructor(message: string, code = 'POLICY_DENIED') {
    super(message);
    this.code = code;
  }
}

interface PolicyContext {
  operation: TaskOperation;
  spec?: TaskSpec;
  patch?: TaskPatch;
  filters?: TaskSearchFilters;
  preconditions?: TaskUpdatePreconditions;
}

interface RateWindow {
  start: number;
  count: number;
}

export class PolicyGate {
  private readonly config: TaskStorePolicyConfig;
  private readonly window: RateWindow;

  constructor(config?: TaskStorePolicyConfig) {
    this.config = {
      allowedOperations: ['search'],
      writeEnabled: false,
      dryRun: false,
      rateLimitPerMinute: undefined,
      requireMoveReason: true,
      ...config,
    };
    this.window = { start: Date.now(), count: 0 };
  }

  get isDryRun(): boolean {
    return Boolean(this.config.dryRun);
  }

  assertAllowed(context: PolicyContext): void {
    const allowedOperations = this.config.allowedOperations ?? ['search'];
    if (!allowedOperations.includes(context.operation)) {
      throw new PolicyError(
        `Operation ${context.operation} is not permitted by policy allowlist.`,
      );
    }

    if (context.operation !== 'search') {
      if (!this.config.writeEnabled && !this.config.dryRun) {
        throw new PolicyError(
          'Write operations are disabled. Enable write operations explicitly to proceed.',
          'WRITE_DISABLED',
        );
      }
    }

    this.assertRateLimit();
    this.assertTagProjectRules(context);
    this.assertMoveReason(context);
  }

  private assertRateLimit(): void {
    if (!this.config.rateLimitPerMinute) {
      return;
    }
    const now = Date.now();
    const elapsed = now - this.window.start;
    if (elapsed > 60_000) {
      this.window.start = now;
      this.window.count = 0;
    }
    this.window.count += 1;
    if (this.window.count > this.config.rateLimitPerMinute) {
      throw new PolicyError('Rate limit exceeded for task operations.', 'RATE_LIMIT');
    }
  }

  private assertTagProjectRules(context: PolicyContext): void {
    const allowedTags = this.config.allowedTags;
    const allowedProjects = this.config.allowedProjects;
    const allowedAreas = this.config.allowedAreas;
    const tags = context.spec?.tags ?? context.patch?.tags ?? [];

    if (allowedTags && tags.some((tag) => !allowedTags.includes(tag))) {
      throw new PolicyError('One or more tags are not allowed by policy.', 'TAG_DENIED');
    }
    const project = context.spec?.project ?? context.patch?.project;
    if (allowedProjects && project && !allowedProjects.includes(project)) {
      throw new PolicyError('Project is not allowed by policy.', 'PROJECT_DENIED');
    }
    const area = context.spec?.area ?? context.patch?.area;
    if (allowedAreas && area && !allowedAreas.includes(area)) {
      throw new PolicyError('Area is not allowed by policy.', 'AREA_DENIED');
    }
  }

  private assertMoveReason(context: PolicyContext): void {
    if (!this.config.requireMoveReason) {
      return;
    }
    const patch = context.patch;
    if (!patch) {
      return;
    }
    const includesMove = patch.project || patch.area;
    if (includesMove && !context.preconditions?.moveReason) {
      throw new PolicyError(
        'Move operations require an explicit moveReason to avoid silent bulk moves.',
        'MOVE_REASON_REQUIRED',
      );
    }
  }
}
