import { BlackbirdIntel } from '../../src/connectors/cis/plugins/blackbird/mapper';

/**
 * Drift Detector for CIS
 * Monitors divergence between vendor signals and internal risk models.
 */
async function main() {
  console.log("Starting CIS Drift Check...");

  try {
    const blackbird = new BlackbirdIntel(process.env.BLACKBIRD_API_KEY || 'mock-key');
    const feed = await blackbird.fetchFeed();

    console.log(`Fetched ${feed.length} narrative items.`);

    // Check for distribution drift
    const highRiskItems = feed.filter(i => i.risk_score > 0.8);
    const highRiskRatio = feed.length > 0 ? highRiskItems.length / feed.length : 0;

    console.log(`High Risk Ratio: ${highRiskRatio.toFixed(2)}`);

    if (highRiskRatio > 0.5) {
       console.warn("WARNING: High risk narrative ratio exceeds 50%. Potential drift or attack.");
       // In real world, emit metric/alert
       // For this test script, we just warn but don't fail unless it's an error
    }

    console.log("CIS Drift Check: PASS");
    process.exit(0);
  } catch (error) {
    console.error("CIS Drift Check Failed:", error);
    process.exit(1);
  }
}

main();
