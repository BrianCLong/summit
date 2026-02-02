from summit.integrations.palantir_apollo_sentient import ValueRealizationEngine

def test_value_realization():
    vre = ValueRealizationEngine()

    # Breach prevention
    val1 = vre.calculate_value("Routed IP to BLACK_HOLE")
    assert val1 == 50000.0

    # Scaling
    val2 = vre.calculate_value("Scaled to replicas: 3")
    assert val2 == 1000.0
