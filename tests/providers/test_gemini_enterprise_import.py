from summit.providers.google import GeminiEnterpriseAdapter


def test_import_and_enterprise_controls() -> None:
    adapter = GeminiEnterpriseAdapter(workspace_id="workspace-123")
    assert adapter.supports_enterprise_controls() is True
