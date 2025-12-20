export class LeaseAcquisitionError extends Error {
  constructor(public readonly key: string) {
    super(`lease already held for ${key}`);
    this.name = 'LeaseAcquisitionError';
  }
}

export class LeaseExpiredError extends Error {
  constructor(public readonly key: string) {
    super(`lease expired for ${key}`);
    this.name = 'LeaseExpiredError';
  }
}

export class FatalJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalJobError';
  }
}

export const isFatalError = (error: unknown): boolean =>
  error instanceof FatalJobError || (error as { fatal?: boolean })?.fatal === true;
