from summit.benchmarks.deepsearchqa.scoring import classify_bucket


def test_fully_correct():
    assert classify_bucket({"a", "b"}, {"a", "b"}) == "Fully Correct"

def test_correct_with_extraneous():
    assert classify_bucket({"a", "b", "c"}, {"a", "b"}) == "Correct w/ Extraneous"

def test_partially_correct():
    assert classify_bucket({"a", "c"}, {"a", "b"}) == "Partially Correct"
    assert classify_bucket({"a"}, {"a", "b"}) == "Partially Correct"

def test_fully_incorrect():
    assert classify_bucket({"c", "d"}, {"a", "b"}) == "Fully Incorrect"
    assert classify_bucket(set(), {"a", "b"}) == "Fully Incorrect"

def test_empty_gt():
    assert classify_bucket({"a"}, set()) == "Correct w/ Extraneous"
    assert classify_bucket(set(), set()) == "Fully Correct"
