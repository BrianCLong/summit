import { register, metrics, stopMetricsCollection } from '../src/monitoring/metrics.js';

async function verify() {
  console.log('Verifying metrics registry...');
  const content = await register.metrics();

  const requiredMetrics = [
    'http_requests_total',
    'db_connections_active',
    'business_user_signups_total',
    'graphql_requests_total'
  ];

  let missing = false;
  for (const m of requiredMetrics) {
    if (content.includes(m)) {
      console.log(`✅ ${m} found`);
    } else {
      console.error(`❌ ${m} NOT found`);
      missing = true;
    }
  }

  if (missing) {
    console.error('Some metrics are missing.');
    process.exit(1);
  }

  console.log('Metrics verification passed.');

  // Also check if we can add to a metric
  metrics.httpRequestsTotal.inc({ method: 'GET', route: '/test', status_code: 200 });
  const newContent = await register.metrics();
  if (newContent.includes('http_requests_total{method="GET",route="/test",status_code="200"} 1')) {
      console.log('✅ Metric increment worked');
  } else {
      console.error('❌ Metric increment failed');
      process.exit(1);
  }

  stopMetricsCollection();
  // Allow time for interval to clear if any
  setTimeout(() => process.exit(0), 100);
}

verify().catch((err) => {
    console.error(err);
    process.exit(1);
});
