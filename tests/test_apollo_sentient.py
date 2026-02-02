from summit.integrations.palantir_apollo_sentient import InfrastructureConsciousness, AutoEvolution, PlanetaryDefense

def test_consciousness():
    ic = InfrastructureConsciousness()
    assert "suffering" in ic.feel(1000.0, 90.0)
    assert "content" in ic.feel(10.0, 10.0)

def test_evolution():
    ae = AutoEvolution()
    manifest = "kind: Deployment\nreplicas: 1"
    new_manifest = ae.evolve(manifest)
    assert "replicas: 3" in new_manifest

def test_defense():
    pd = PlanetaryDefense()
    res = pd.defend("1.2.3.4", True)
    assert "BLACK_HOLE" in res
