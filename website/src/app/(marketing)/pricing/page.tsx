import { Section } from "@/components/site/Section";
import { Card } from "@/components/ui/Card";

export default function PricingPage() {
  const tiers = [
    {
      name: "Community",
      price: "$0",
      description: "For trying the safest personal agent.",
      features: ["1 agent", "10 runs/day", "7-day receipts", "Observe/Assist mode", "Verified skills only", "Cost guardrails"],
    },
    {
      name: "Pro",
      price: "$19/mo",
      description: "For daily delegation with proof.",
      features: ["1-2 agents", "100 runs/day", "90-day receipts", "Approvals + policies", "Export evidence bundles", "Model routing"],
    },
    {
      name: "Power",
      price: "$39/mo",
      description: "For heavy automation and research.",
      features: ["Up to 3 agents", "300 runs/day", "365-day receipts", "Scheduled jobs", "Governed browser tools", "Skill builder"],
    },
    {
      name: "White-Label",
      price: "from $99/mo",
      description: "For creators and SMBs shipping their own agent.",
      features: ["Agent-seat for 5 users", "500+ runs/day", "Tenant branding", "Org policy overlay", "SSO-lite", "Audit exports"],
    },
  ];

  return (
    <div className="space-y-12">
      <Section
        kicker="Pricing"
        title="Switchboard — the provable personal agent."
        subtitle="Automate real work across your apps with signed receipts, governed skills, and policy guardrails—so you can delegate safely and prove what happened."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier) => (
          <Card key={tier.name} title={tier.name} subtitle={tier.price}>
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted)]">{tier.description}</p>
              <ul className="space-y-2">
                {tier.features.map((feature) => (
                  <li key={feature} className="text-xs text-[var(--muted2)] flex items-center">
                    <span className="mr-2 text-green-500">✓</span> {feature}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      <Section title="What's a run?" subtitle="A run is one completed job: plan → tool calls → receipt. You always see what happened, what was blocked, and why." />

      <Section title="Verified skills only by default." subtitle="No random plugins. Every skill is signed, sandboxed, and permission-scoped. Receipts show every privileged action and the policy decision behind it." />

      <div className="rounded-2xl border border-[var(--border)] p-8 bg-[rgba(255,255,255,0.02)]">
        <h3 className="text-lg font-semibold mb-4">Why Switchboard?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-medium text-[var(--fg)]">Open ecosystems</h4>
            <p className="text-sm text-[var(--muted)] mt-2">"Install anything" approach leads to higher risk, higher variance, and unpredictable costs.</p>
          </div>
          <div>
            <h4 className="font-medium text-[var(--fg)]">Switchboard</h4>
            <p className="text-sm text-[var(--muted)] mt-2">"Install verified, governed skills" approach ensures predictable cost and provable control.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
