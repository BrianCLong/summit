import { createSummitSDK, IntelGraphCoreClient } from '@intelgraph/sdk';

async function main() {
  const apiKey = process.env.SUMMIT_API_KEY;
  if (!apiKey) {
    console.error('Error: SUMMIT_API_KEY environment variable is required.');
    process.exit(1);
  }

  console.log('Initializing Summit SDK...');

  // Initialize the Governance Layer (Policy, Compliance, Evidence)
  const sdk = createSummitSDK({
    apiKey: apiKey,
    baseUrl: 'https://api.summit.intelgraph.ai'
  });

  // Initialize the Core Intelligence Layer (Entities, Graphs, Analytics)
  const core = new IntelGraphCoreClient({
    TOKEN: apiKey,
  });

  try {
    const graphId = 'investigation-' + Date.now();
    console.log(`Using Graph ID: ${graphId}`);

    // ----------------------------------------------------------------------
    // Step 1: Investigate an Entity
    // ----------------------------------------------------------------------
    console.log('\n[Step 1] Creating investigation target...');

    // Note: In a real scenario, you might create the graph first using core.graphAnalytics.postGraphs({ ... })
    // For this example, we assume the graph might be auto-created or we are adding to an existing context.

    const target = await core.entities.postGraphsEntities({
      graphId,
      requestBody: {
        name: 'Suspicious Corp Ltd',
        type: 'organization',
        properties: {
          registration_number: '12345678',
          jurisdiction: 'offshore-haven'
        }
      }
    });

    console.log(`✅ Tracked target: ${target.name} (${target.id})`);

    // ----------------------------------------------------------------------
    // Step 2: Monitor the Graph
    // ----------------------------------------------------------------------
    console.log('\n[Step 2] Analyzing graph for risks...');

    // Wait for agents to process (simulated delay for example)
    await new Promise(resolve => setTimeout(resolve, 2000));

    const insights = await core.graphAnalytics.getGraphsInsights({
      graphId,
      severity: 'high'
    });

    const risks = insights.insights?.filter(i => i.type === 'risk') || [];

    if (risks.length > 0) {
      console.log(`⚠️ High risk detected: ${risks.length} issues found.`);
      risks.forEach(r => console.log(`   - ${r.description}`));
    } else {
      console.log('ℹ️ No high risks detected yet.');
    }

    // ----------------------------------------------------------------------
    // Step 3: Explain the Decision (Governance)
    // ----------------------------------------------------------------------
    console.log('\n[Step 3] Generating evidence bundle...');

    const evidence = await sdk.compliance.createEvidence({
      type: 'investigation_report',
      title: `Risk Report for ${target.name}`,
      content: {
        targetId: target.id,
        riskCount: risks.length,
        topology: insights.coverage,
        timestamp: new Date().toISOString()
      },
      tags: ['compliance', 'pci-dss']
    });

    console.log(`✅ Evidence created: ${evidence.id}`);
    if (evidence.provenanceChainId) {
      console.log(`🔐 Audit Trail: ${evidence.provenanceChainId}`);
    }

  } catch (error) {
    console.error('Error executing Quickstart:', error);
    process.exit(1);
  }
}

main();
