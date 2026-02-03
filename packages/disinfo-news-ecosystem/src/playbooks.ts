export function generatePlaybook(report: any) {
  const mitigations = [];
  const targetingGap: any = {};

  // Fact-check routing
  if (report.signals.network?.coordinated_sharing_events > 0 || report.signals.content?.sensationalism_score > 0.8) {
     mitigations.push({
       type: "fact_check_routing",
       action: "Deploy targeted fact-checks to exposed communities",
       rationale: "High risk of viral spread detected."
     });

     // Targeting Gap Analysis
     targetingGap.exposed_communities = ["identified_network_clusters"];
     targetingGap.correction_coverage = "low";
     targetingGap.recommendation = "Increase fact-check distribution in identified clusters";
  }

  // Prebunking
  if (report.signals.content?.sensationalism_score > 0.5) {
      mitigations.push({
          type: "prebunking",
          action: "Deploy inoculation content regarding sensationalist tropes",
          resources: ["bad_news_game_link", "manipulation_primer"]
      });
  }

  return { mitigations, targetingGap };
}
