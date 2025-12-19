import crypto from 'node:crypto';
import { FlagClient, FlagContext } from '../../../../libs/flags/node';

const client = new FlagClient({ env: process.env.NODE_ENV ?? 'dev' });
const hydrationFlag = client.catalogKey('feature.web.flag-hydration');

export interface HydratedFlags {
  values: Record<string, unknown>;
  checksum: string;
}

export async function evaluatePageFlags(context: Partial<FlagContext> = {}): Promise<HydratedFlags> {
  const value = await client.get<boolean>(hydrationFlag, true, context);
  const values = { [hydrationFlag]: value };
  return { values, checksum: checksum(values) };
}

export function validateChecksum(payload: HydratedFlags): boolean {
  return payload.checksum === checksum(payload.values);
}

function checksum(values: Record<string, unknown>): string {
  return crypto.createHash('sha1').update(JSON.stringify(values)).digest('hex');
}
