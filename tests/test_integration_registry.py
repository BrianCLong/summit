from summit.integrations.registry import IntegrationRegistry, IntegrationSpec


def test_integration_registry_register_and_get() -> None:
  registry = IntegrationRegistry()
  spec = IntegrationSpec(name="slack", kind="managed", never_log_fields=("token",))

  registry.register(spec)

  assert registry.get("slack") == spec
  assert registry.get("missing") is None
