import pytest

from modules.feed.narrative_feed import FeedItem, build_feed


def test_feed_ordering_is_deterministic():
    item1 = FeedItem("N1", 80, 0.9, [], "Line1", {})
    item2 = FeedItem("N2", 90, 0.8, [], "Line2", {})
    item3 = FeedItem("N3", 80, 0.5, [], "Line3", {})

    input_list = [item1, item2, item3]
    # Expect: N2 (90), N1 (80, 0.9), N3 (80, 0.5)

    feed = build_feed(input_list)
    assert feed[0].narrative_id == "N2"
    assert feed[1].narrative_id == "N1"
    assert feed[2].narrative_id == "N3"
