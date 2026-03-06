from summit.policy.compfeat_policy import evaluate_compfeat

def test_denies_when_flag_off():
  d = evaluate_compfeat(actor={"role":"admin"}, request={}, flags={"compfeat_enabled": False})
  assert d.allowed is False
  assert d.reason == "feature_flag_disabled"

def test_denies_untrusted_actor():
  d = evaluate_compfeat(actor={"role":"user"}, request={}, flags={"compfeat_enabled": True})
  assert d.allowed is False
  assert d.reason == "actor_not_authorized"

def test_allows_trusted_when_flag_on():
  d = evaluate_compfeat(actor={"role":"trusted_tester"}, request={}, flags={"compfeat_enabled": True})
  assert d.allowed is True
