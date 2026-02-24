import { z } from 'zod';

const SAFE_IDENTIFIER = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const SAFE_RPC_METHOD = /^[a-z0-9][a-z0-9._-]{0,95}$/i;
const SAFE_SESSION_ID = /^sess_[0-9a-f-]{36}$/i;

export const toolClassSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    SAFE_IDENTIFIER,
    'toolClass must use alphanumeric, dot, underscore, or dash characters',
  );

export const rpcMethodSchema = z
  .string()
  .min(1)
  .max(96)
  .regex(
    SAFE_RPC_METHOD,
    'method must use alphanumeric, dot, underscore, or dash characters',
  );

export const sessionIdSchema = z
  .string()
  .regex(SAFE_SESSION_ID, 'invalid session id format');

export function parseToolClass(input: unknown): string {
  return toolClassSchema.parse(input);
}

export function parseRpcMethod(input: unknown): string {
  return rpcMethodSchema.parse(input);
}

export function parseSessionId(input: unknown): string {
  return sessionIdSchema.parse(input);
}
