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
  "imputed_intentions": [
    "1:troubleshoot",
    "2:troubleshoot in ui_troubleshooting",
    "3:troubleshoot with visual evidence provided",
    "4:troubleshoot referencing Error 403",
    "5:troubleshoot with 1 unresolved slots",
    "6:troubleshoot producing steps output",
    "7:troubleshoot constrained by explicitation context",
    "8:troubleshoot scoped to user-provided evidence",
    "9:troubleshoot refinement 1 in ui_troubleshooting",
    "10:troubleshoot refinement 2 in ui_troubleshooting",
    "11:troubleshoot refinement 3 in ui_troubleshooting",
    "12:troubleshoot refinement 4 in ui_troubleshooting",
    "13:troubleshoot refinement 5 in ui_troubleshooting",
    "14:troubleshoot refinement 6 in ui_troubleshooting",
    "15:troubleshoot refinement 7 in ui_troubleshooting",
    "16:troubleshoot refinement 8 in ui_troubleshooting",
    "17:troubleshoot refinement 9 in ui_troubleshooting",
    "18:troubleshoot refinement 10 in ui_troubleshooting",
    "19:troubleshoot refinement 11 in ui_troubleshooting",
    "20:troubleshoot refinement 12 in ui_troubleshooting",
    "21:troubleshoot refinement 13 in ui_troubleshooting",
    "22:troubleshoot refinement 14 in ui_troubleshooting",
    "23:troubleshoot refinement 15 in ui_troubleshooting"
  ],
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
- `imputed_intentions` must include 23 ordered intent refinements for downstream routing.

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
