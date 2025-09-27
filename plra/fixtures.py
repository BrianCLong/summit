"""Seeded fixtures for deterministic testing of the PLRA library."""

from __future__ import annotations

import itertools
import random
from typing import Dict, List

RandomRecord = Dict[str, object]


def load_seeded_fixture(seed: int = 1337, size: int = 128) -> List[RandomRecord]:
    """Return a deterministic synthetic dataset with quasi-identifiers.

    The fixture intentionally injects a handful of high-risk combinations so that
    tests can assert recall of the auditor. The baseline records repeat common
    combinations to keep the population density realistic.
    """

    rng = random.Random(seed)
    regions = ["north", "south", "east", "west"]
    age_bands = ["18-25", "26-35", "36-45", "46-60"]
    professions = ["engineer", "teacher", "nurse", "artist"]

    dataset: List[RandomRecord] = []
    grid = list(itertools.product(regions, age_bands, professions))
    for idx in range(size):
        region, age_band, profession = grid[idx % len(grid)]
        record = {
            "token": f"tok_{idx:03d}",
            "region": region,
            "age_band": age_band,
            "profession": profession,
        }
        dataset.append(record)

    rng.shuffle(dataset)

    unique_records = [
        {"token": "tok_high_1", "region": "isle-of-man", "age_band": "18-25", "profession": "cryptographer"},
        {"token": "tok_high_2", "region": "antarctica", "age_band": "61-80", "profession": "nurse"},
        {"token": "tok_high_3", "region": "okinawa", "age_band": "46-60", "profession": "astronaut"},
    ]
    dataset.extend(unique_records)

    return dataset
