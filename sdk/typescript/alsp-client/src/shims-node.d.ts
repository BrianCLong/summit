declare module "crypto" {
  interface Hash {
    update(data: string | ArrayBufferView): Hash;
    digest(): Buffer;
  }
  function createHash(algorithm: string): Hash;
}

declare class Buffer extends Uint8Array {
  static from(data: string | ArrayBufferView, encoding?: string): Buffer;
  static alloc(size: number): Buffer;
  static compare(a: Buffer, b: Buffer): number;
  writeBigUInt64BE(value: bigint, offset?: number): number;
  toString(encoding?: string): string;
}

declare interface ArrayBufferView {
  readonly buffer: ArrayBuffer;
  readonly byteOffset: number;
  readonly byteLength: number;
}

declare const globalThis: typeof globalThis;
