import { Section } from "@/components/site/Section";
import { Card } from "@/components/ui/Card";

export default function ProductsPage() {
  return (
    <div className="space-y-8">
      <Section kicker="Products" title="Products" subtitle="Built for real operators: governed, observable, and ready for scrutiny." />
      <Card title="Summit" subtitle="Intelligence workflows with governance">
        <p className="text-sm text-[var(--muted)]">
          Summit packages ingest, graph reasoning, provenance, and predictive overlays with clear trust boundaries. Additional
          product surfaces can be layered without reworking the core architecture.
        </p>
      </Card>
    </div>
  );
}
