from packages.common.circuit_breaker import BreakerConfig, CircuitBreaker

# Example singleton instance
# In real usage, this might be injected or configured per-service
outbound_breaker = CircuitBreaker(BreakerConfig(
    window_size=100,
    error_rate_to_open=0.5,
    open_seconds=30
))

def make_outbound_call(url: str):
    """
    Example wrapper demonstrating circuit breaker usage.
    """
    if not outbound_breaker.allow():
        raise Exception("Circuit breaker is OPEN")

    try:
        # Simulate network call
        # response = requests.get(url)
        success = True # Assume success for stub
        outbound_breaker.record(success)
        return "success"
    except Exception as e:
        outbound_breaker.record(False)
        raise e
