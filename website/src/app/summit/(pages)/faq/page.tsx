import { Section } from "@/components/site/Section";
import { Card } from "@/components/ui/Card";

const faqs = [
  { q: "Is Summit a product or a platform?", a: "A platform with product surfaces. It must operate, be audited, and evolve." },
  { q: "What makes Summit different?", a: "It treats trust (policy + provenance) as a first-class product surface, not an afterthought." },
  { q: "How do you handle uncertainty?", a: "By recording boundaries—confidence, provenance, and hypotheses—rather than smearing guesses into facts." }
];

export default function FAQ() {
  return (
    <div className="space-y-10">
      <Section kicker="Summit" title="FAQ" subtitle="Direct answers, minimal marketing noise." />
      <div className="grid gap-4">
        {faqs.map((f) => (
          <Card key={f.q} title={f.q} subtitle="">
            <p className="text-sm text-[var(--muted)]">{f.a}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
