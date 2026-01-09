import { createHash, createHmac } from 'crypto';

export const createProvenanceRecord = (
  input: string,
  algo: string,
  version: string,
  timestamp: string
) => {
  const inputHash = createHash('sha256').update(`${algo}:${input}`).digest('hex');
  const signature = createHmac('sha256', 'test-key')
    .update(`${inputHash}:${version}:${timestamp}`)
    .digest('hex');

  return {
    inputHash,
    signature,
  };
};

export default { createProvenanceRecord };
