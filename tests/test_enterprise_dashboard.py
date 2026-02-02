from summit.enterprise.dashboard_metrics import ExecutiveDashboard

def test_dashboard_report():
    dash = ExecutiveDashboard()
    ledger = [{"value": 1000}, {"value": 500}]
    incidents = [{"id": 1}]

    report = dash.generate_report(ledger, incidents)

    assert "$1,500.00" in report
    assert "Risk Score: 95/100" in report
