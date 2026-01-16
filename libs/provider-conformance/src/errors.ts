export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ProviderAuthError extends ProviderError {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderAuthError';
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderRateLimitError';
  }
}

export class ProviderContractViolation extends ProviderError {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderContractViolation';
  }
}

export class ProviderRequestError extends ProviderError {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderRequestError';
  }
}
