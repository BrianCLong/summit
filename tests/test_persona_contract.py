import pytest

from summit.persona.contract import PersonaContract


def test_contract_requires_forbidden_axes():
  c = PersonaContract(persona_id="default", version="1.0.0")
  with pytest.raises(ValueError, match="forbidden_axes must include"):
    c.validate()

def test_contract_valid():
    c = PersonaContract(
        persona_id="default",
        version="1.0.0",
        forbidden_axes=["romantic_entanglement", "coercion", "authority_impersonation"]
    )
    c.validate()
