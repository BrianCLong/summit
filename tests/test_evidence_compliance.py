from summit.evidence.palantir_truth import RegulatoryComplianceReport

def test_compliance_report():
    rep = RegulatoryComplianceReport()
    logs = ["User A accessed PII", "User B requested delete"]

    cert = rep.generate_report(logs)
    assert "PII Access Events: 1" in cert
    assert "Right-to-Be-Forgotten Executions: 1" in cert
    assert "COMPLIANT" in cert
