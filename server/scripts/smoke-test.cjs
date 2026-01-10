const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const HEALTH_ENDPOINT = `${BASE_URL}/health`;

async function runSmokeTest() {
  console.log(`Running smoke test against ${HEALTH_ENDPOINT}...`);
  try {
    const response = await axios.get(HEALTH_ENDPOINT);
    if (response.status === 200 && response.data?.status === 'ok') {
      console.log('✅ Smoke test passed: Service is healthy.');
      process.exit(0);
    } else {
      console.error('❌ Smoke test failed: Invalid response', response.status, response.data);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Smoke test failed: Connection error', error.message);
    process.exit(1);
  }
}

runSmokeTest();
