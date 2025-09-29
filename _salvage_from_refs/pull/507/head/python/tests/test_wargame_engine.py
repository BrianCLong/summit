from wargame_engine import Map, Unit, OpticalSensor, Simulation


def test_basic_simulation_runs():
    grid = [[0, 0], [0, 0]]
    game_map = Map(grid)
    unit_a = Unit("A", "blue", (0, 0), [OpticalSensor(range=2)])
    unit_b = Unit("B", "red", (1, 1), [OpticalSensor(range=2)])
    sim = Simulation(game_map, [unit_a, unit_b], max_turns=1)
    analytics = sim.run()
    summary = analytics.summary()
    assert summary["runs"] == 1
