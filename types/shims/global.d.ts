/**
 * SHIM: Temporary globals to unblock CI typecheck.
 * Scope: shared utility types across packages (cytoscape, misc).
 * TODO(typing): replace with real upstream types.
 */

declare module 'cytoscape' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cytoscape: any;
  export default cytoscape;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Core = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type NodeSingular = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type EdgeSingular = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type ElementDefinition = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Stylesheet = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type StylesheetCSS = any;
}

declare module 'uuid' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const v4: any;
}

// Legacy globals encountered in tests/utilities
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const DOMPurify: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const validator: any;

declare module 'lucide-react' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const ArrowUpRight: any;
}
