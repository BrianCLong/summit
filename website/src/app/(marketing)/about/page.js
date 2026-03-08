"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AboutPage;
const Section_1 = require("@/components/site/Section");
function AboutPage() {
    return (<Section_1.Section kicker="Topicality" title="About" subtitle="Topicality builds, studies, and deploys complex systems across initiatives, labs, and research programs.">
      <p className="text-sm text-[var(--muted)]">
        The platform is designed to accommodate multiple companies and research lines without re-architecting the information
        surface. Summit is the flagship instantiation; additional initiatives can be introduced without breaking navigation or
        trust signals.
      </p>
    </Section_1.Section>);
}
