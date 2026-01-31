import json
import os

import pytest

from psychographics.mft.scorer import MFTScorer

FIXTURES_DIR = "psychographics/mft/fixtures"

def load_fixture(filename):
    with open(os.path.join(FIXTURES_DIR, filename)) as f:
        return json.load(f)

def test_positive_fixture():
    data = load_fixture("positive.json")
    scorer = MFTScorer()
    score = scorer.score(data["text"])
    assert score.care_harm == data["expected_care"]
    assert score.fairness_cheating == data["expected_fairness"]

def test_negative_fixture():
    data = load_fixture("negative.json")
    scorer = MFTScorer()
    score = scorer.score(data["text"])
    assert score.care_harm == data["expected_care"]
    assert score.fairness_cheating == data["expected_fairness"]
