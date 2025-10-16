import { getLogs } from './util';
const DISALLOWED = [/email/i, /password/i, /ssn/i, /credit/i];

it('no PII appears in logs', async () => {
  const logs = await getLogs();
  for (const k of DISALLOWED) expect(logs).not.toMatch(k);
});
