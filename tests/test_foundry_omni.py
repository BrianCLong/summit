from summit.integrations.palantir_foundry_omni import EntanglementBus, UniversalSchema, RealityForkingEngine

def test_entanglement():
    EntanglementBus.entangle("electron_spin", "up")
    assert EntanglementBus.observe("electron_spin") == "up"

def test_universal_schema():
    schema = UniversalSchema()
    schema.ingest({"a": 1})
    assert schema.fields["a"] == "int"

    schema.ingest({"a": "string"})
    assert "Union" in schema.fields["a"]

def test_reality_forking():
    engine = RealityForkingEngine({"sky": "blue"})

    # Fork universe
    alt_id = engine.fork("root")

    # Change alt universe
    engine.realities[alt_id].state["sky"] = "red"

    # Verify root is unchanged
    assert engine.realities["root"].state["sky"] == "blue"
    assert engine.realities[alt_id].state["sky"] == "red"

    # Merge back (last write wins)
    engine.merge(alt_id, "root", lambda t, s: s)
    assert engine.realities["root"].state["sky"] == "red"
