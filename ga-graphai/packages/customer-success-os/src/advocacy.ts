import { AdvocacyCandidate, HealthScore, PlaybookAction } from "./types";

export function identifyAdvocacyCandidates(health: HealthScore): AdvocacyCandidate[] {
  if (health.score < 75) {
    return [];
  }
  const proofs = health.components
    .filter((component) => component.score > 70)
    .map((component) => `${component.component}:${component.score}`);
  const protections: PlaybookAction[] = [
    {
      id: `${health.tenantId}-advocate-fast-lane`,
      category: "advocacy",
      description: "Provide fast support lane and roadmap visibility to protect advocates",
    },
    {
      id: `${health.tenantId}-advocate-trust`,
      category: "advocacy",
      description: "Share quarterly trust and reliability updates",
    },
  ];
  return [
    {
      tenantId: health.tenantId,
      rationale: ["High health score and positive outcomes", ...proofs],
      asks: [
        "Case study with proof metrics",
        "Reference call for target ICP",
        "Community session participation",
      ],
      protections,
    },
  ];
}
