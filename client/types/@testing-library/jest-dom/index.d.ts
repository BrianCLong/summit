declare global {
  namespace jest {
    interface Matchers<R = any> {
      toBeInTheDocument(): R;
      toBeVisible(): R;
      toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace?: boolean }): R;
      toHaveAttribute(name: string, value?: string | RegExp): R;
      toHaveClass(...classNames: string[]): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toHaveStyle(css: string | Record<string, unknown>): R;
      toHaveValue(value?: string | string[] | number): R;
      toBeEmptyDOMElement(): R;
    }
  }
}

export {};
