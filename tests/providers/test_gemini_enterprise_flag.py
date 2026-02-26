import json

import pytest

from summit.providers.google import EnterprisePolicyError, GeminiEnterpriseAdapter


def test_deny_by_default_when_policy_missing() -> None:
    adapter = GeminiEnterpriseAdapter(workspace_id="workspace-123")

    with pytest.raises(EnterprisePolicyError, match="missing"):
        adapter.enforce_policy(None)


def test_workspace_id_required() -> None:
    adapter = GeminiEnterpriseAdapter(workspace_id=None)

    with pytest.raises(EnterprisePolicyError, match="Workspace ID required"):
        adapter.enforce_policy({"workspace_bound": True, "controls": []})


def test_deterministic_report(tmp_path) -> None:
    adapter = GeminiEnterpriseAdapter(workspace_id="workspace-123")
    output = tmp_path / "report.json"

    payload = adapter.write_deterministic_report(
        output,
        {"workspace_bound": True, "controls": ["GEM-ENT-AUTH-001"]},
    )

    assert payload == {
        "provider": "google_gemini_enterprise",
        "workspace_bound": True,
        "policy_status": "enforced",
        "controls": ["GEM-ENT-AUTH-001"],
    }

    first = output.read_text(encoding="utf-8")
    second = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    assert first == second
