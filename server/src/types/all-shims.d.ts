// Catch-all shim to treat any non-core import as 'any' during core typecheck
declare module '*' {
  const anyExport: any;
  export = anyExport;
}
