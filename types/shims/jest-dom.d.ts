/**
 * SHIM: jest-dom / chai matcher typings to unblock test typechecking.
 * TODO(typing): import proper @testing-library/jest-dom / vitest types.
 */

declare namespace jest {
  interface Matchers<R> {
    toBeInTheDocument(): R;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toHaveTextContent(text?: any): R;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toHaveAttribute(attr: string, value?: any): R;
    toBeDisabled(): R;
  }
}

declare namespace Chai {
  interface Assertion {
    toBeInTheDocument(): Assertion;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toHaveTextContent(text?: any): Assertion;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toHaveAttribute(attr: string, value?: any): Assertion;
    toBeDisabled(): Assertion;
  }
}
