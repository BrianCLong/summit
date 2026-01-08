declare const process: any;
declare const Buffer: any;

declare module "node:fs" {
  const fs: any;
  export = fs;
}

declare module "node:path" {
  const path: any;
  export = path;
}

declare module "node:crypto" {
  const crypto: any;
  export = crypto;
}

declare module "node:url" {
  function fileURLToPath(path: string): string;
  function pathToFileURL(path: string): any;
  export { fileURLToPath, pathToFileURL };
}

declare module "node:test" {
  const test: any;
  export = test;
}

declare module "node:assert" {
  const assert: any;
  export = assert;
}
