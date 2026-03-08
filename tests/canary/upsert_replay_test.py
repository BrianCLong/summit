import itertools
import random

import pytest


def gen_events(pk, values, base_lsn):
    # make dupes, tombstones, and out-of-order permutations
    events = []
    lsn = base_lsn
    for v in values:
        lsn += random.randint(1, 5)
        events.append({"op":"u","after":{"pk":pk, "col_a":v}, "source":{"lsn":lsn}})
        if random.random() < 0.2:  # occasional duplicate
            events.append({"op":"u","after":{"pk":pk, "col_a":v}, "source":{"lsn":lsn}})
        if random.random() < 0.1:  # tombstone
            lsn += 1
            events.append({"op":"d","before":{"pk":pk},"source":{"lsn":lsn}})
    return events

@pytest.mark.parametrize("trial", range(1000))
def test_idempotent_final_state(trial, client_pg, client_neo, consumer):
    pk = {"pk1": 42, "pk2": "A"}
    values = ["v1","v2","v3","v3","v4"]
    events = gen_events(pk, values, base_lsn=10_000)

    # Compare final state across 3 randomized replays
    snapshots = []
    for _ in range(3):
        replay = events[:]
        random.shuffle(replay)
        # feed to consumer (Kafka mock or direct submit)
        for e in replay:
            consumer.handle(e)
        # read back from PG + Neo4j
        row = client_pg.fetch_one("SELECT col_a, last_applied_lsn FROM public.your_table WHERE pk_col1=42 AND pk_col2='A'")
        node = client_neo.run("MATCH (n:Label{pk:$pk}) RETURN n.col_a AS col_a, n.__last_applied_lsn AS lsn", pk="42|A").single()
        snapshots.append((row, node))

    # deterministic across permutations
    assert len(set(map(str, snapshots))) == 1
