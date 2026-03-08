import json

from summit.providers.google import GeminiEnterpriseAdapter
from summit.providers.google.policy import enforce_admin_policy


def test_import_and_enterprise_capability():
    adapter = GeminiEnterpriseAdapter(
        workspace_id="ws-123",
        admin_policy={"mode": "strict"},
        enterprise_flag=True,
    )

    assert adapter.PROVIDER_ID == "google_gemini_enterprise"
    assert adapter.supports_enterprise_controls() is True
    assert adapter.is_enabled() is True


def test_deny_by_default_when_policy_missing():
    result = enforce_admin_policy(None)

    assert result.allowed is False
    assert result.policy_status == "missing"
    assert result.violations == ("GEM-ENT-POLICY-001",)


def test_report_json_is_deterministic(tmp_path):
    adapter = GeminiEnterpriseAdapter(
        workspace_id="ws-123",
        admin_policy=None,
        enterprise_flag=True,
    )

    report_path = tmp_path / "report.json"
    adapter.write_report(report_path)
    first = report_path.read_text(encoding="utf-8")
    adapter.write_report(report_path)
    second = report_path.read_text(encoding="utf-8")

    assert first == second
    payload = json.loads(first)
    assert payload == {
        "controls": [{"id": "GEM-ENT-POLICY-001", "status": "deny"}],
        "policy_status": "missing",
        "provider": "google_gemini_enterprise",
        "workspace_bound": True,
    }
