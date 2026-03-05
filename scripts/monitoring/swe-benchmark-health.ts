async function monitorHealth() {
  console.log('Monitoring task failure rate and docker build failures...');
}

monitorHealth().catch(console.error);
