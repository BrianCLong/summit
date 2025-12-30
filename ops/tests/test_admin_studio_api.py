import unittest

from ops import admin_studio_api


class AdminStudioFeatureFlagTest(unittest.TestCase):
    def setUp(self) -> None:
        self._original_state = admin_studio_api.list_feature_flags()

    def tearDown(self) -> None:
        admin_studio_api.reset_feature_flags(self._original_state)

    def test_toggle_feature_flag_updates_state(self) -> None:
        self.assertFalse(admin_studio_api.get_feature_flag_state("new_feature"))
        toggled = admin_studio_api.toggle_feature_flag("new_feature", True)

        self.assertTrue(toggled)
        self.assertTrue(admin_studio_api.get_feature_flag_state("new_feature"))

    def test_toggle_unknown_flag_does_not_mutate_known_flags(self) -> None:
        before = admin_studio_api.list_feature_flags()

        toggled = admin_studio_api.toggle_feature_flag("nonexistent", True)

        self.assertFalse(toggled)
        self.assertEqual(before, admin_studio_api.list_feature_flags())
        self.assertFalse(admin_studio_api.get_feature_flag_state("nonexistent"))

    def test_reset_feature_flags_restores_defaults(self) -> None:
        admin_studio_api.toggle_feature_flag("new_feature", True)
        admin_studio_api.reset_feature_flags()

        expected = admin_studio_api._DEFAULT_FEATURE_FLAGS.copy()
        self.assertEqual(expected, admin_studio_api.list_feature_flags())
        self.assertFalse(admin_studio_api.get_feature_flag_state("new_feature"))


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
