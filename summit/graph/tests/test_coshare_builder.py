from summit.graph.builders.coshare import build_actor_similarity


def test_build_actor_similarity_counts_pairs():
    events = [
        ("actor-a", "url-1", 1),
        ("actor-b", "url-1", 2),
        ("actor-a", "url-2", 3),
        ("actor-b", "url-2", 4),
    ]

    result = build_actor_similarity(events, min_shared=2)

    assert result == {("actor-a", "actor-b"): 2}


def test_build_actor_similarity_threshold_filters_pairs():
    events = [
        ("actor-a", "url-1", 1),
        ("actor-b", "url-1", 2),
        ("actor-a", "url-2", 3),
    ]

    result = build_actor_similarity(events, min_shared=2)

    assert result == {}


def test_build_actor_similarity_dedupes_per_object():
    events = [
        ("actor-a", "url-1", 1),
        ("actor-a", "url-1", 2),
        ("actor-b", "url-1", 3),
    ]

    result = build_actor_similarity(events, min_shared=1)

    assert result == {("actor-a", "actor-b"): 1}


def test_build_actor_similarity_multiple_objects():
    events = [
        ("actor-a", "url-1", 1),
        ("actor-b", "url-1", 2),
        ("actor-a", "url-2", 3),
        ("actor-c", "url-2", 4),
    ]

    result = build_actor_similarity(events, min_shared=1)

    assert result == {
        ("actor-a", "actor-b"): 1,
        ("actor-a", "actor-c"): 1,
    }


def test_build_actor_similarity_empty_events():
    result = build_actor_similarity([], min_shared=1)

    assert result == {}
