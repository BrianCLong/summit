import subprocess
import os

def test_entropy_guard_finds_violation():
    # Run entropy guard on the fixtures directory
    env = os.environ.copy()
    env["SUMMIT_ENTROPY_GUARD"] = "on"
    # We use the real rules but it will find the bad fixture
    result = subprocess.run(
        ["python3", "tools/entropy_guard/entropy_guard.py"],
        env=env,
        capture_output=True,
        text=True
    )
    # It should find at least one violation from the bad fixture
    assert "[WARN] [EG-001-global-listeners]" in result.stdout
    assert "tools/entropy_guard/tests/fixtures/bad_global_listener.example" in result.stdout
