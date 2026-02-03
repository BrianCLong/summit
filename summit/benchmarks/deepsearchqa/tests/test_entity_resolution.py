from summit.benchmarks.deepsearchqa.entity_resolution import EntityResolver, canonicalize


def test_canonicalize_heuristics():
    assert canonicalize("United States") == "united states"
    assert canonicalize("France!!!") == "france"
    assert canonicalize("  New   York  ") == "new york"
    assert canonicalize("U.S.A.") == "usa"
    assert canonicalize("") == ""

def test_entity_resolver_deduplication():
    resolver = EntityResolver(enabled=True)
    items = [
        "United States",
        "united states",
        "  UNITED STATES  ",
        "France",
        "FRANCE!",
        "Germany"
    ]
    # Should keep the first occurrence of each unique canonical entity
    resolved = resolver.resolve(items)
    assert resolved == ["United States", "France", "Germany"]

def test_entity_resolver_preserves_order():
    resolver = EntityResolver(enabled=True)
    items = ["B", "a", "b", "A"]
    resolved = resolver.resolve(items)
    assert resolved == ["B", "a"]

def test_entity_resolver_disabled():
    resolver = EntityResolver(enabled=False)
    items = ["USA", "usa", "USA"]
    assert resolver.resolve(items) == ["USA", "usa", "USA"]
