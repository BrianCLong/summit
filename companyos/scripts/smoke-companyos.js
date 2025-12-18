const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, res => {
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });
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

  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const body = await get(url);
      console.log(`✅ CompanyOS health OK: ${body}`);
      process.exit(0);
    } catch (err) {
      console.log(`Attempt ${attempt}/${maxAttempts} failed:`, err.message);
      if (attempt === maxAttempts) {
        console.error('❌ CompanyOS smoke test failed.');
        process.exit(1);
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

main();
