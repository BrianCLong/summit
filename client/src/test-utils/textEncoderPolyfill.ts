interface MinimalTextEncoder {
  encode: (input?: string) => Uint8Array;
}

interface MinimalTextDecoder {
  decode: () => string;
}

type PolyfilledGlobal = typeof globalThis & {
  TextEncoder?: new () => MinimalTextEncoder;
  TextDecoder?: new () => MinimalTextDecoder;
};

const globalObj = globalThis as PolyfilledGlobal;

if (!globalObj.TextEncoder) {
  globalObj.TextEncoder = class {
    encode(input?: string) {
      const safeValue = input ?? '';
      return new Uint8Array(safeValue.length);
    }
  } as unknown as typeof globalObj.TextEncoder;
}

if (!globalObj.TextDecoder) {
  globalObj.TextDecoder = class {
    decode() {
      return '';
    }
  } as unknown as typeof globalObj.TextDecoder;
}
