import { Section } from "@/components/site/Section";

export default function AboutPage() {
  return (
    <Section kicker="Topicality" title="About" subtitle="Topicality builds, studies, and deploys complex systems across initiatives, labs, and research programs.">
      <p className="text-sm text-[var(--muted)]">
        The platform is designed to accommodate multiple companies and research lines without re-architecting the information
        surface. Summit is the flagship instantiation; additional initiatives can be introduced without breaking navigation or
        trust signals.
      </p>
    </Section>
  );
}
