declare module 'fs' {
  const value: any;
  export = value;
}

declare module 'path' {
  const value: any;
  export = value;
}

declare const process: {
  cwd(): string;
};
