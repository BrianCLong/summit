from intelgraph.observability import counter, histogram, start_span

# We assume OTel is NOT installed in the baseline environment.
# If it IS installed, we can skip or adapt.
# For now, we test the interface works without crashing.


def test_tracing_noop_interface():
    # This should not raise
    with start_span("test_span", foo="bar") as span:
        pass


def test_metrics_noop_interface():
    # This should not raise
    c = counter("test_counter")
    c.add(1)
    c.add(10, {"attr": "val"})

    h = histogram("test_histogram")
    h.record(1.5)
    h.record(20.0, {"attr": "val"})


def test_imports():
    import intelgraph.observability

    assert hasattr(intelgraph.observability, "start_span")
