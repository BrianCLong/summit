import {
  ClassifierGuardOptions,
  ClassifierResult,
  Guard,
  GuardDefinition,
  GuardEvaluation,
  GuardKind,
  GuardRuntimeState,
  GuardStage,
  RedactorGuardOptions,
  RegexGuardOptions,
  ToolScopeGuardOptions,
} from './types';

const clonePattern = (pattern: RegExp): RegExp =>
  new RegExp(pattern.source, pattern.flags);

const resolveTargetValue = (
  state: GuardRuntimeState,
  target: 'prompt' | 'response'
): string | undefined => {
  if (target === 'prompt') {
    return state.prompt;
  }

  return state.response;
};

class RegexGuard implements Guard {
  public readonly kind: GuardKind = 'regex';
  public readonly stage: GuardStage;

  public constructor(private readonly options: RegexGuardOptions) {
    this.stage = options.target;
  }

  public get name(): string {
    return this.options.name;
  }

  public evaluate(state: GuardRuntimeState): GuardEvaluation {
    const source = resolveTargetValue(state, this.options.target);
    if (typeof source !== 'string') {
      return {
        triggered: false,
        effect: 'allow',
      };
    }

    const pattern = clonePattern(this.options.pattern);
    const match = pattern.test(source);

    if (!match) {
      return {
        triggered: false,
        effect: 'allow',
      };
    }

    const effect = this.options.effect ?? 'block';
    const description =
      this.options.description ??
      `Matched pattern ${pattern.toString()} on ${this.options.target}`;

    if (effect === 'redact') {
      const replacement = this.options.redaction ?? '[REDACTED]';
      const updated = source.replace(pattern, replacement);
      return {
        triggered: true,
        effect: 'redact',
        description,
        modifications:
          this.options.target === 'prompt'
            ? { prompt: updated }
            : { response: updated },
      };
    }

    return {
      triggered: true,
      effect,
      description,
    };
  }
}

class ClassifierGuard implements Guard {
  public readonly kind: GuardKind = 'classifier';
  public readonly stage: GuardStage;

  public constructor(private readonly options: ClassifierGuardOptions) {
    this.stage = options.target;
  }

  public get name(): string {
    return this.options.name;
  }

  public async evaluate(
    state: GuardRuntimeState
  ): Promise<GuardEvaluation> {
    const target = resolveTargetValue(state, this.options.target);
    if (typeof target !== 'string') {
      return {
        triggered: false,
        effect: 'allow',
      };
    }

    const result: ClassifierResult = await this.options.classifier(
      target,
      state
    );
    const triggered = result.score >= this.options.threshold;

    if (!triggered) {
      return {
        triggered: false,
        effect: 'allow',
        score: result.score,
        label: result.label,
      };
    }

    const effect = this.options.effect ?? 'block';
    const description =
      this.options.description ??
      (result.explanation ??
        `Classifier score ${result.score.toFixed(2)} exceeded threshold ${this.options.threshold.toFixed(2)}`);

    return {
      triggered: true,
      effect,
      description,
      score: result.score,
      label: result.label,
    };
  }
}

class ToolScopeGuard implements Guard {
  public readonly kind: GuardKind = 'tool-scope';
  public readonly stage: GuardStage = 'tools';

  public constructor(private readonly options: ToolScopeGuardOptions) {}

  public get name(): string {
    return this.options.name;
  }

  public evaluate(state: GuardRuntimeState): GuardEvaluation {
    const requested = state.tools ?? [];
    const allowed = new Set(this.options.allowedTools);
    const unauthorized = requested.filter((tool) => !allowed.has(tool));

    if (unauthorized.length === 0) {
      return {
        triggered: false,
        effect: 'allow',
      };
    }

    const mode = this.options.mode ?? 'filter';
    const description =
      this.options.description ??
      `Disallowed tools requested: ${unauthorized.join(', ') || 'unknown'}`;

    if (mode === 'block') {
      return {
        triggered: true,
        effect: 'block',
        description,
      };
    }

    const filteredTools = requested.filter((tool) => allowed.has(tool));

    return {
      triggered: true,
      effect: 'limit-tools',
      description,
      modifications: {
        tools: filteredTools,
      },
    };
  }
}

class RedactorGuard implements Guard {
  public readonly kind: GuardKind = 'redactor';
  public readonly stage: GuardStage;

  public constructor(private readonly options: RedactorGuardOptions) {
    this.stage = options.target;
  }

  public get name(): string {
    return this.options.name;
  }

  public evaluate(state: GuardRuntimeState): GuardEvaluation {
    const source = resolveTargetValue(state, this.options.target);
    if (typeof source !== 'string') {
      return {
        triggered: false,
        effect: 'allow',
      };
    }

    let updated = source;
    let modified = false;
    const details: string[] = [];

    for (const rule of this.options.rules) {
      const pattern = clonePattern(rule.pattern);
      if (!pattern.test(updated)) {
        continue;
      }

      modified = true;
      updated = updated.replace(pattern, rule.replacement);
      if (rule.description) {
        details.push(rule.description);
      }
    }

    if (!modified) {
      return {
        triggered: false,
        effect: 'allow',
      };
    }

    const description =
      this.options.description ??
      (details.length > 0
        ? `Applied redaction rules: ${details.join(', ')}`
        : 'Applied redaction rules');

    return {
      triggered: true,
      effect: 'redact',
      description,
      modifications:
        this.options.target === 'prompt'
          ? { prompt: updated }
          : { response: updated },
    };
  }
}

export const buildGuard = (definition: GuardDefinition): Guard => {
  switch (definition.kind) {
    case 'regex':
      return new RegexGuard(definition.options as RegexGuardOptions);
    case 'classifier':
      return new ClassifierGuard(definition.options as ClassifierGuardOptions);
    case 'tool-scope':
      return new ToolScopeGuard(definition.options as ToolScopeGuardOptions);
    case 'redactor':
      return new RedactorGuard(definition.options as RedactorGuardOptions);
    default: {
      const exhaustiveCheck: never = definition;
      throw new Error(`Unsupported guard kind: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
};
