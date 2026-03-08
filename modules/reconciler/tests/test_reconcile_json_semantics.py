import unittest

from modules.reconciler.reconcile import reconcile_expected_vs_actual


class TestReconciler(unittest.TestCase):
    def test_reconcile_match(self):
        expected = [{"id": 1, "val": "a"}, {"id": 2, "val": "b"}]
        actual = [{"id": 1, "val": "a"}, {"id": 2, "val": "b"}]
        ok, problems = reconcile_expected_vs_actual(expected, actual)
        self.assertTrue(ok)
        self.assertEqual(len(problems), 0)

    def test_reconcile_row_count_mismatch(self):
        expected = [{"id": 1}]
        actual = []
        ok, problems = reconcile_expected_vs_actual(expected, actual)
        self.assertFalse(ok)
        self.assertIn("ROWCOUNT expected=1 actual=0", problems)

    def test_reconcile_value_mismatch(self):
        expected = [{"id": 1, "val": "a"}]
        actual = [{"id": 1, "val": "b"}]
        ok, problems = reconcile_expected_vs_actual(expected, actual)
        self.assertFalse(ok)
        self.assertTrue(any("MISMATCH row=0 key=val expected='a' actual='b'" in p for p in problems))

    def test_reconcile_silent_null_failure(self):
        # Simulates the "silent JSON failure" where a load succeeds but produces NULLs
        expected = [{"id": 1, "data": {"foo": "bar"}}]
        actual = [{"id": 1, "data": None}] # or specific keys missing/null
        ok, problems = reconcile_expected_vs_actual(expected, actual)
        self.assertFalse(ok)
        self.assertTrue(any("MISMATCH" in p for p in problems))

    def test_reconcile_missing_key(self):
        expected = [{"id": 1, "required_col": "x"}]
        actual = [{"id": 1}]
        ok, problems = reconcile_expected_vs_actual(expected, actual)
        self.assertFalse(ok)
        self.assertTrue(any("MISSING_KEY row=0 key=required_col" in p for p in problems))

if __name__ == "__main__":
    unittest.main()
