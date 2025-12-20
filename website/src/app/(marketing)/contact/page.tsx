import { Section } from "@/components/site/Section";

export default function ContactPage() {
  return (
    <Section kicker="Contact" title="Get in touch" subtitle="Reach the Topicality team for partnerships, security reviews, or live testing access.">
      <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
        <li>Email: contact@topicality.co</li>
        <li>Security: security@topicality.co</li>
        <li>Responsible disclosure encouraged; PGP available on request.</li>
      </ul>
    </Section>
  );
}
