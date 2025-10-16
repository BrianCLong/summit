import jwt from 'jsonwebtoken';
export function mintCapToken({
  runId,
  stepId,
  tenant,
  caps,
}: {
  runId: string;
  stepId: string;
  tenant: string;
  caps: string[];
}) {
  return jwt.sign(
    {
      sub: `${tenant}:${runId}:${stepId}`,
      caps,
      aud: 'plugin',
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.CAPS_SIGNING_KEY!,
    { algorithm: 'HS256', expiresIn: '10m' },
  );
}
export function verifyCapToken(token: string) {
  return jwt.verify(token, process.env.CAPS_SIGNING_KEY!);
}
