declare module 'apollo3-cache-persist' {
  export const persistCache: any;
  export class LocalStorageWrapper {
    constructor(storage: Storage);
  }
}

declare module 'crypto-js/sha256' {
  const sha256: (input: string) => { toString(): string };
  export default sha256;
}

declare module '@testing-library/react-hooks' {
  export * from '@testing-library/react';
}

declare module 'fast-check';

declare module 'jquery' {
  const jq: any;
  export default jq;
}
