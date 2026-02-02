from summit.integrations.palantir_singularity import WorldSolver

def test_singularity_solver():
    solver = WorldSolver()
    result = solver.solve("Climate Change")

    assert "SINGULARITY SOLUTION" in result
    assert "Problem: Climate Change" in result
    assert "Value Created: $1,000,000.00" in result
