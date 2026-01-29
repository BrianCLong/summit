from summit_ttt.reuse_puct import PUCTBuffer

def test_puct_buffer_selection():
    buffer = PUCTBuffer(c_puct=1.0)
    buffer.add("a1", prior_score=1.0) # High prior
    buffer.add("a2", prior_score=0.1) # Low prior

    # First selection should be a1 due to higher prior (Q=0 for both)
    # u1 = 1 * 1 * sqrt(0)/(1) = 0
    # Wait, sqrt(0) is 0. So score is 0 for both?
    # Actually if total_visits is 0, u is 0.
    # We need tie-breaking or better logic for N=0.
    # Usually we use N_parent or similar. Here N is total_visits.
    # If total_visits=0, u=0.

    # Let's update logic to handle init case, or just rely on stable sort?
    # My implementation:
    # score = node.q_value + u
    # if score > best_score: update
    # a1: 0 + 0 = 0
    # a2: 0 + 0 = 0
    # a1 selected (first encountered).

    s1 = buffer.select()
    assert s1 == "a1"

    # Now total_visits=1.
    # a1: visit=1, Q=0. u = 1 * 1 * 1 / 2 = 0.5. Score=0.5
    # a2: visit=0, Q=0. u = 1 * 0.1 * 1 / 1 = 0.1. Score=0.1
    # a1 selected again?

    s2 = buffer.select()
    assert s2 == "a1"

    # Update a1 with bad score
    buffer.update("a1", -1.0)
    # a1: visit=2, val=-1, Q=-0.5. total=2.
    # a1 u = 1 * 1 * sqrt(2)/3 = 1.414/3 = 0.47. Score = -0.5 + 0.47 = -0.03
    # a2: visit=0, Q=0. u = 1 * 0.1 * sqrt(2)/1 = 0.1414. Score = 0.14
    # a2 should be selected.

    s3 = buffer.select()
    assert s3 == "a2"

def test_empty_buffer():
    buffer = PUCTBuffer()
    assert buffer.select() is None
