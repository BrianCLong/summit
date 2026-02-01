from summit.api.v1.compfeat import post_compfeat

def test_e2e_stub_success_for_trusted():
  resp = post_compfeat(actor={"role":"trusted_tester"}, payload={"x": 1}, flags={"compfeat_enabled": True})
  assert resp["ok"] is True
  assert resp["result"]["status"] == "stub"
