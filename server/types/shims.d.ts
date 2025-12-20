declare module '*';

declare const console: { [key: string]: (...args: any[]) => void };
declare function setTimeout(
  handler: (...args: any[]) => void,
  timeout?: number,
  ...args: any[]
): any;

declare var process: {
  env: Record<string, string | undefined>;
};

declare function require(path: string): any;
declare var module: any;

// Minimal Jest globals for local tests
declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => any): void;
declare function test(name: string, fn: () => any): void;
declare function expect(value: any): any;
declare function beforeEach(fn: () => any): void;
declare function afterAll(fn: () => any): void;
