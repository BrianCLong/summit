/**
 * SHIM: uuid helpers to unblock typecheck.
 * TODO(typing): use real uuid types.
 */

declare module 'uuid' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const v4: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const v1: any;
}
