import { threatHuntingService } from '../services/threatHuntingService';

async function runDemo() {
  console.log('=== CTI Platform Demo ===');
  console.log('1. Fetching Threat Actors...');
  const actors = threatHuntingService.getThreatActors();
  console.log(`Found ${actors.length} actors.`);
  if (actors.length > 0) {
    console.log('Sample Actor:', actors[0]);

    console.log('\n2. Analyzing Diamond Model for Actor 1...');
    const diamond = threatHuntingService.analyzeDiamondModel(actors[0].id);
    console.log('Diamond Model:', JSON.stringify(diamond, null, 2));
  }

  console.log('\n3. Fetching Malware...');
  const malware = threatHuntingService.getMalwareList();
  console.log(`Found ${malware.length} malware families.`);
  if (malware.length > 0) {
    console.log('Sample Malware:', malware[0]);
  }

  console.log('\n4. Analyzing Attack Chain for an Incident...');
  const chain = threatHuntingService.analyzeAttackChain('incident-123');
  console.log('Attack Chain:', JSON.stringify(chain, null, 2));

  console.log('\n5. Calculating Threat Score...');
  const score = threatHuntingService.getThreatScore('actor-1');
  console.log(`Threat Score for actor-1: ${score}`);

  console.log('\n6. Fetching IOCs...');
  const iocs = threatHuntingService.getIOCs({ limit: 5 });
  console.log(`Found ${iocs.length} active IOCs.`);
  if (iocs.length > 0) {
      console.log('Sample IOC:', iocs[0]);
  }

  console.log('\n=== Demo Complete ===');
  process.exit(0);
}

runDemo().catch(console.error);
