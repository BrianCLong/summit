You are a Bi-Fact judge. Extract atomic facts from the intent sentence.

Intent:
"""
{{intent}}
"""

Rules:
- Split into minimal, independent facts.
- Do not infer beyond the text.
- Output ONLY valid JSON.

JSON schema:
{
  "facts": ["string"]
}
