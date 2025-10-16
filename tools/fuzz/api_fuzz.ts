import fetch from 'node-fetch';
import fc from 'fast-check';

const base = process.env.BASE || 'http://localhost:4000';
const arbs = {
  decision: fc.constantFrom('allow', 'deny'),
  policy: fc.string({ minLength: 3, maxLength: 32 }),
  resource: fc.record({
    kind: fc.constantFrom('Pod', 'Job'),
    name: fc.string(),
    ns: fc.string(),
  }),
  details: fc.anything(),
};

async function postAdmission(p: any) {
  const r = await fetch(`${base}/api/admission/event`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(p),
  });
  return r.status;
}

(async () => {
  await fc.assert(
    fc.asyncProperty(fc.record(arbs), async (payload) => {
      const s = await postAdmission(payload);
      if (![200, 400, 422].includes(s)) throw new Error(`unexpected ${s}`);
    }),
    { numRuns: 100 },
  );
  console.log('API fuzz OK');
})();
