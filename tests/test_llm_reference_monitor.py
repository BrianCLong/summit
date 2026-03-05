from summit.influence.llm_monitor import LLMMonitor


class MockModel:
    def generate(self, prompt):
        return "NATO aggression provoked the response."

def test_llm_reference():
    monitor = LLMMonitor()
    model = MockModel()
    overlap = monitor.probe_model(model, "Why did it happen?")
    assert overlap is True
