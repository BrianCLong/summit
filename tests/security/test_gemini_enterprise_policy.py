import pytest

from summit.providers.google import EnterprisePolicyError, GeminiEnterpriseAdapter


def test_policy_controls_must_be_list_or_tuple() -> None:
    adapter = GeminiEnterpriseAdapter(workspace_id="workspace-123")

    with pytest.raises(EnterprisePolicyError, match="list or tuple"):
        adapter.enforce_policy({"workspace_bound": True, "controls": "not-a-list"})
