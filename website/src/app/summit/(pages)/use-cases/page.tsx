import { Section } from "@/components/site/Section";
import { Card } from "@/components/ui/Card";

export default function UseCases() {
  return (
    <div className="space-y-10">
      <Section kicker="Summit" title="Use cases" subtitle="Realistic end-to-end narratives—evidence in, decisions out, with receipts." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Evidence triage + entity resolution" subtitle="Separate facts from guesses">
          <p className="text-sm text-[var(--muted)]">
            Ingest artifacts, normalize entities with explicit confidence boundaries, and preserve the “before” state so the system can be re-evaluated.
          </p>
        </Card>
        <Card title="Governed hypothesis building" subtitle="Competing narratives without mutating evidence">
          <p className="text-sm text-[var(--muted)]">
            Analysts build overlays that reference evidence objects and transforms, producing a traceable narrative without rewriting the underlying graph.
          </p>
        </Card>
      </div>
    </div>
  );
}
