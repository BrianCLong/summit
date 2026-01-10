// The ReleaseBundleErrorCode type is for documentation and TypeScript users.
// In a pure .mjs file, we can't enforce this at runtime without a build step.
// The error codes are used as strings by the throwing scripts.

export class ReleaseBundleError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'ReleaseBundleError';
    this.code = code;
    this.details = details;
  }
}
