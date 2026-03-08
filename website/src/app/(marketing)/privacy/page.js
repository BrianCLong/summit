"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PrivacyPage;
const Section_1 = require("@/components/site/Section");
function PrivacyPage() {
    return (<Section_1.Section kicker="Privacy" title="Privacy" subtitle="Data minimization by design: first-party analytics only, no content capture, clear retention controls.">
      <p className="text-sm text-[var(--muted)]">
        We collect only high-level interaction events for live testing. Sensitive content is never captured. Logs are rotated and
        can be piped into a customer-owned sink for review. Contact security@topicality.co for data handling specifics.
      </p>
    </Section_1.Section>);
}
