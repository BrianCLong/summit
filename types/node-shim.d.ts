declare module 'fs' {
  const anything: any;
  export = anything;
}

declare module 'path' {
  const anything: any;
  export = anything;
}

declare module 'child_process' {
  const anything: any;
  export = anything;
}

declare module 'process' {
  export const env: Record<string, string | undefined>;
  export function cwd(): string;
  export let exitCode: number | undefined;
}

declare const process: {
  env: Record<string, string | undefined>;
  cwd: () => string;
  exitCode?: number;
};
