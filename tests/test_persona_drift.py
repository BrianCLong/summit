from summit.persona.drift import score_drift


def test_drift_detects_change():
  b = {"lex_div": 0.10, "sentiment": 0.00}
  c = {"lex_div": 0.25, "sentiment": 0.20}
  s = score_drift(b, c)
  assert s.total > 0.0
  # 0.25 - 0.10 = 0.15. Floating point equality might be tricky, use approx if needed, but simple subtraction should work for these values or use tolerance
  assert abs(s.components["lex_div"] - 0.15) < 0.0001

def test_drift_is_zero_when_equal():
  b = {"lex_div": 0.10}
  s = score_drift(b, {"lex_div": 0.10})
  assert s.total == 0.0
