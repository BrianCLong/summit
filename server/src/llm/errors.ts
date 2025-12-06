export class LLMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMError';
  }
}

export class ProviderError extends LLMError {
  constructor(public providerName: string, message: string, public cause?: unknown) {
    super(`Provider '${providerName}' failed: ${message}`);
    this.name = 'ProviderError';
  }
}

export class SafetyViolationError extends LLMError {
  constructor(public guardrailName: string, message: string) {
    super(`Safety guardrail '${guardrailName}' triggered: ${message}`);
    this.name = 'SafetyViolationError';
  }
}

export class RoutingError extends LLMError {
  constructor(message: string) {
    super(message);
    this.name = 'RoutingError';
  }
}
