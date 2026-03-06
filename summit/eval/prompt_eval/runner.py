from typing import Any

from .scorers import format_compliance_rate


class MockLLM:
    def generate(self, prompt_text: str) -> str:
        # Simple deterministic mock
        # Check specific content indicators first
        lower_text = prompt_text.lower()

        if "bad" in lower_text or "terrible" in lower_text:
            return "Negative"
        if "good" in lower_text or "great" in lower_text or "love" in lower_text:
            return "Positive"

        # Fallback only if no strong sentiment found
        if "neutral" in lower_text:
             # But wait, if "Neutral" is in the prompt template, this always hits.
             # Let's assume input text needs to have "okay" or similar for true neutral in this mock
             if "okay" in lower_text:
                 return "Neutral"

        return "Unknown"

def run_eval(prompt_artifact: dict[str, Any], fixtures: list[dict[str, Any]]) -> dict[str, Any]:
    llm = MockLLM()
    template = prompt_artifact.get("user_template", "{{text}}")
    output_format = prompt_artifact.get("output_format", "one-word")

    outputs = []
    for case in fixtures:
        # Simple jinja replace
        prompt_text = template.replace("{{text}}", case.get("input", ""))
        output = llm.generate(prompt_text)
        outputs.append(output)

    score = format_compliance_rate(outputs, output_format)

    return {
        "score": score,
        "outputs": outputs
    }
