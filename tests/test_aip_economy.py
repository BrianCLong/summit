from summit.integrations.palantir_aip_economy import AgentMarket, GeneticOptimizer, AgentGenome, CodeEvolutionEngine

def test_agent_market_auction():
    market = AgentMarket()
    market.register_agent(AgentGenome("cheap", 0.5, "do_it"))
    market.register_agent(AgentGenome("expensive", 2.0, "do_it_well"))

    # Budget 1.0 -> Cheap wins
    res = market.submit_task("Task 1", 1.0)
    assert "cheap" in res

    # Budget 0.1 -> None
    res2 = market.submit_task("Task 2", 0.1)
    assert "No agents" in res2

def test_genetic_evolution():
    optimizer = GeneticOptimizer()
    pop = [
        AgentGenome("a1", 1.0, "AAAA", score=10),
        AgentGenome("a2", 1.0, "BBBB", score=5),
        AgentGenome("a3", 1.0, "CCCC", score=1),
        AgentGenome("a4", 1.0, "DDDD", score=0)
    ]

    next_gen = optimizer.evolve(pop)
    assert len(next_gen) == 4
    # Top scorer 'a1' should survive
    assert any(a.id == "a1" for a in next_gen)

def test_code_evolution():
    engine = CodeEvolutionEngine()
    src = "def run():\n  time.sleep(1)"
    patch = engine.propose_patch(src, "optimize speed")
    assert "time.sleep(0.1)" in patch
