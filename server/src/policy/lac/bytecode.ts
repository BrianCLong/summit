import { Buffer } from 'node:buffer';
import { PolicyProgram } from './types.js';

const MAGIC = Buffer.from('LAC1', 'utf8');
const VERSION = 1;

export function encodeProgram(program: PolicyProgram): Buffer {
  const payload = Buffer.from(JSON.stringify(program), 'utf8');
  const header = Buffer.allocUnsafe(8);
  MAGIC.copy(header, 0);
  header.writeUInt32BE(VERSION, 4);
  const lengthBuffer = Buffer.allocUnsafe(4);
  lengthBuffer.writeUInt32BE(payload.length, 0);
  return Buffer.concat([header, lengthBuffer, payload]);
}

export function decodeProgram(bytecode: Buffer): PolicyProgram {
  if (bytecode.length < 12) {
    throw new Error('Invalid LAC bytecode: payload too small');
  }
  const magic = bytecode.subarray(0, 4).toString('utf8');
  if (magic !== 'LAC1') {
    throw new Error(`Invalid LAC bytecode: unexpected magic ${magic}`);
  }
  const version = bytecode.readUInt32BE(4);
  if (version !== VERSION) {
    throw new Error(`Unsupported LAC bytecode version ${version}`);
  }
  const length = bytecode.readUInt32BE(8);
  const payload = bytecode.subarray(12, 12 + length);
  const parsed: PolicyProgram = JSON.parse(payload.toString('utf8'));
  return parsed;
}
