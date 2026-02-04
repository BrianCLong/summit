from summit.integrations.palantir_foundry_federated import FederatedNode, ConsensusEngine, PrivateSetIntersection

def test_consensus_election():
    nodes = [FederatedNode(f"n{i}") for i in range(5)]
    engine = ConsensusEngine(nodes)

    leader_id = engine.elect_leader()
    assert leader_id is not None

    leader = next(n for n in nodes if n.node_id == leader_id)
    assert leader.is_leader
    assert leader.term == 1

    # Check followers updated term
    follower = next(n for n in nodes if n.node_id != leader_id)
    assert follower.term == 1
    assert not follower.is_leader

def test_consensus_replication():
    nodes = [FederatedNode(f"n{i}") for i in range(3)]
    engine = ConsensusEngine(nodes)
    engine.elect_leader()

    success = engine.append_entry("UPDATE_SCHEMA_V2")
    assert success

    # verify majority have it
    count = sum(1 for n in nodes if "UPDATE_SCHEMA_V2" in n.state_log)
    assert count >= 2

def test_psi_correctness():
    n1 = FederatedNode("n1", data_shard={"alice", "bob", "charlie"})
    n2 = FederatedNode("n2", data_shard={"bob", "dave", "charlie"})

    # Intersection should be {bob, charlie} -> 2 items

    intersection = PrivateSetIntersection.compute_intersection(n1, n2)
    assert len(intersection) == 2

    # Verify no false positives
    n3 = FederatedNode("n3", data_shard={"eve"})
    intersection_empty = PrivateSetIntersection.compute_intersection(n1, n3)
    assert len(intersection_empty) == 0
