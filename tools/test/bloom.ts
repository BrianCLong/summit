export function setBit(buf: Uint8Array, h: number) {
  buf[h % (buf.length * 8) >> 3] |= 1 << h % 8;
}
