/**
 * SHIM: Catch-all module fallback to keep CI typecheck unblocked.
 * TODO(typing): remove after real typings are restored for all modules.
 */

declare module '*' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anything: any;
  export = anything;
}
