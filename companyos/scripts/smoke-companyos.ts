import http from 'http';

function get(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    http
      .get(url, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`Status ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        });
      })
      .on('error', reject);
  });
}

async function main() {
  const url = process.env.COMPANYOS_HEALTH_URL ?? 'http://localhost:4100/health';

  // simple wait loop: 10 attempts, 3s apart
  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const body = await get(url);
      // eslint-disable-next-line no-console
      console.log(`✅ CompanyOS health OK: ${body}`);
      process.exit(0);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(`Attempt ${attempt}/${maxAttempts} failed:`, (err as Error).message);
      if (attempt === maxAttempts) {
        // eslint-disable-next-line no-console
        console.error('❌ CompanyOS smoke test failed.');
        process.exit(1);
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

void main();
