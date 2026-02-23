import time

from packages.common.circuit_breaker import BreakerConfig, CircuitBreaker, State


def test_circuit_breaker_opens_after_threshold():
  # window=10, 50% error rate -> 5 failures needed if window is full
  cb = CircuitBreaker(BreakerConfig(window_size=10, error_rate_to_open=0.5, open_seconds=60))

  # Fill window with success
  for _ in range(5):
      cb.record(True)
  assert cb.state == State.CLOSED

  # Add failures
  for _ in range(5):
      cb.record(False)
  # Now we have 5 success, 5 failures. 5/10 = 0.5. Should open.
  assert cb.state == State.OPEN
  assert cb.allow() is False

def test_circuit_breaker_half_open_recovery():
  cb = CircuitBreaker(BreakerConfig(window_size=2, error_rate_to_open=0.5, open_seconds=0)) # 0s open for fast test
  cb.record(False)
  cb.record(False)
  assert cb.state == State.OPEN

  # Wait for open_seconds (0s)
  time.sleep(0.1)

  # First call allows transition to HALF_OPEN
  assert cb.allow() is True
  assert cb.state == State.HALF_OPEN

  # Success should close it
  cb.record(True)
  assert cb.state == State.CLOSED
  assert cb.allow() is True
