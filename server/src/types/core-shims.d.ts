// Core-only shims to prevent traversal into feature modules during core typecheck
declare module './graphql/*' {
  const anyExport: any;
  export = anyExport;
}
declare module './routes/*' {
  const anyExport: any;
  export = anyExport;
}
declare module './monitoring/*' {
  const anyExport: any;
  export = anyExport;
}
declare module './middleware/*' {
  const anyExport: any;
  export = anyExport;
}
declare module './workers/*' {
  const anyExport: any;
  export = anyExport;
}
declare module './db/*' {
  const anyExport: any;
  export = anyExport;
}
