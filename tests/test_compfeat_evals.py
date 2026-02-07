from summit.evals.compfeat.harness import run_fixture


def test_eval_positive_fixture_matches_expected():
  r = run_fixture("summit/evals/compfeat/fixtures/positive.json")
  assert r["got"]["status"] == r["expected"]["status"]

def test_eval_negative_fixture_matches_expected():
  r = run_fixture("summit/evals/compfeat/fixtures/negative.json")
  assert r["got"]["status"] == r["expected"]["status"]
