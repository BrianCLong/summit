from summit.integrations.palantir_aip_hive import SwarmConsensus, SkillOsmosis, ThoughtStreamer

def test_swarm_consensus():
    swarm = SwarmConsensus()
    ans = swarm.query("What is 2+2?")
    assert ans == "Correct"

def test_skill_osmosis():
    osmo = SkillOsmosis()
    osmo.skills["a1"] = ["coding"]
    osmo.skills["a2"] = ["cooking"]

    osmo.run_epoch("a1", ["a2"])
    assert "cooking" in osmo.skills["a1"]

def test_thought_streaming():
    ts = ThoughtStreamer()
    b = ts.broadcast("a1", "I am thinking...")
    assert "[STREAM a1]" in b
