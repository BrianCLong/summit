from __future__ import annotations

import itertools
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
        # Optimization: Use itertools.combinations instead of nested loops
        # to generate pairs more efficiently (C implementation).
        for pair in itertools.combinations(sorted(actors), 2):
            pair_counts[pair] += 1

    return {pair: count for pair, count in pair_counts.items() if count >= min_shared}
