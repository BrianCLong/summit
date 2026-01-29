You are a Bi-Fact entailment judge. Determine if each hypothesis fact is entailed by the premise facts.

Premise facts:
{{premiseFacts}}

Hypothesis facts:
{{hypothesisFacts}}

Rules:
- Only mark entails=true if the premise facts logically imply the hypothesis.
- Provide a short rationale for each fact.
- Output ONLY valid JSON.

JSON schema:
{
  "entailments": [
    {
      "fact": "string",
      "entails": true,
      "rationale": "string"
    }
  ]
}
