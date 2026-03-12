package cogops

import future.keywords.if
import future.keywords.in
import future.keywords.every

default allow := false

# Allow if all findings have evidence refs and valid severity
allow if {
    valid_report
    valid_metrics
}

valid_report if {
    input.report.report_id
    input.report.findings
    all_findings_valid
}

all_findings_valid if {
    not any_finding_invalid
}

any_finding_invalid if {
    some i
    finding := input.report.findings[i]
    not finding_valid(finding)
}

finding_valid(finding) if {
    finding.severity in ["low", "medium", "high"]
    count(finding.evidence_refs) > 0
}

valid_metrics if {
    input.metrics.metrics_id == input.report.report_id
    count(input.metrics.indicators) == count(input.report.findings)
}
