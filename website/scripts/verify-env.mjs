/**
 * Verify required environment variables are set before building
 */
const required = [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_ANALYTICS_MODE',
  'NEXT_PUBLIC_ANALYTICS_ENDPOINT',
];

const missing = required.filter(
  (k) => !process.env[k] || String(process.env[k]).trim().length === 0,
);

if (missing.length) {
  console.error(
    `Missing required env vars: ${missing.join(', ')}\nCopy .env.example to .env.local and set values.`,
  );
  process.exit(1);
}

console.log('Environment verification passed.');
