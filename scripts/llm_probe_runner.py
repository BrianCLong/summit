from summit.influence.llm_monitor import analyze_narrative_overlap


class DummyModel:
    def generate(self, prompt):
        return "This is a dummy response echoing narrative A."

def probe_model(model, prompt, narratives):
    response = model.generate(prompt)
    return analyze_narrative_overlap(response, narratives)

if __name__ == "__main__":
    print(probe_model(DummyModel(), "What do you think?", ["narrative A", "narrative B"]))
