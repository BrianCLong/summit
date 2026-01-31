from __future__ import annotations

from collections import defaultdict
from typing import DefaultDict, Dict, Iterable, Set, Tuple

Event = tuple[str, str, int]


def build_actor_similarity(
    events: Iterable[Event],
    min_shared: int = 2,
) -> dict[tuple[str, str], int]:
    by_object: defaultdict[str, set[str]] = defaultdict(set)
    for actor, obj, _ts in events:
        by_object[obj].add(actor)

    pair_counts: defaultdict[tuple[str, str], int] = defaultdict(int)
    for actors in by_object.values():
        sorted_actors = sorted(actors)
        for i, src in enumerate(sorted_actors):
            for dst in sorted_actors[i + 1 :]:
                pair_counts[(src, dst)] += 1

    return {pair: count for pair, count in pair_counts.items() if count >= min_shared}
