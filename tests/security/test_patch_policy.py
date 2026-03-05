import pytest

from agents.policy.diff_policy import PatchPolicyViolation, check_patch_policy


def test_patch_policy_blocks_forbidden_content() -> None:
    with pytest.raises(PatchPolicyViolation):
        check_patch_policy(["rm -rf /"])
