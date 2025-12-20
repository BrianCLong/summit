type BufferEncoding = string;

declare module 'crypto' {
  export const randomUUID: () => string;
  export function createHash(algo: string): { update(data: any): any; digest(encoding: string): string };
  export function generateKeyPairSync(
    type: string,
  ): { privateKey: unknown; publicKey: { export: (options: { type: string; format: 'der' }) => Buffer } };
  export function sign(algorithm: any, data: Buffer, key: unknown): { toString: (encoding: string) => string };
  export function verify(
    algorithm: any,
    data: Buffer,
    key: { key: Buffer; format: 'der'; type: 'spki' },
    signature: Buffer,
  ): boolean;
}

// Minimal Buffer surface for type-checking without pulling full Node types
declare const Buffer: {
  from: (data: any, encoding?: BufferEncoding) => Buffer;
  concat: (buffers: Buffer[]) => Buffer;
  new (): Buffer;
};
