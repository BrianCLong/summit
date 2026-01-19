# Maestro Query Explicitation Contract

The explicitation stage converts underspecified multimodal requests into a
structured artifact that is safe to use for retrieval. The contract enforces
**Explicitate → Retrieve → Solve**: retrieval must use the explicitation artifact
(or a governance waiver) instead of raw user text.

## Explicitation Artifact (JSON)

```json
{
  "explicit_query": "How do I fix the screenshot content? Visual evidence: Provided screenshot; shows: Login error banner; detected text: Error 403: Forbidden.",
  "intent": "troubleshoot",
  "domain_guess": "ui_troubleshooting",
  "entities": ["Error 403"],
  "visual_evidence": ["Provided screenshot; shows: Login error banner; detected text: Error 403: Forbidden"],
  "assumptions": ["Visual evidence reflects the user-provided images."],
  "unknown_slots": [
    {
      "slot": "app_or_system",
      "why_it_matters": "Needed to match troubleshooting guidance to the correct product.",
      "ask_user_if_low_confidence": true
    }
  ],
  "retrieval_plan": [
    {
      "source": "kb",
      "query": "Look up internal guidance for: <explicit_query>"
    }
  ],
  "answer_style": "steps",
  "confidence": 0.62,
  "clarifying_question": "Which application or system is shown in the screenshot?"
}
```

### Field requirements

- `explicit_query` must be self-contained and replace deictic references.
- `visual_evidence` must summarize any provided images (screenshot/photo/diagram/map).
- `unknown_slots` must capture unresolved ambiguity without inventing personal data.
- `retrieval_plan` must be built from `explicit_query` and resolved entities.
- `confidence` must be surfaced; low confidence yields a single clarifying question.

## Retrieval gate

Retrieval is blocked if explicitation is missing, unless a governance waiver is
provided with `waiverId`, `approvedBy`, and `reason`.

## Tool endpoint

The `explicate_query` tool returns the explicitation artifact and is safe for
MCP/Maestro tool routing. Inputs:

```json
{
  "user_text": "How do I fix this?",
  "image_refs": [
    {"id": "img-1", "type": "screenshot", "altText": "Login error banner", "detectedText": "Error 403"}
  ],
  "conversation_context": {"summary": "User is troubleshooting Outlook sync failures."}
}
```

## Demo command

```bash
maestro explicate \
  --text "How do I fix this?" \
  --image '{"id":"img-1","type":"screenshot","altText":"Login error banner","detectedText":"Error 403"}'
```

The command prints the explicitation artifact JSON to stdout.
