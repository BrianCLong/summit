# Jules – Behavioral Test Spec

## Test Case 1 – Always Produce PR Metadata

**Given** a non-trivial development task  
**When** Jules completes the work  
**Then** the output must include:
- A clear PR title
- A concise summary
- A list of changed areas (code, tests, docs)
- Any risks or follow-ups

---

## Test Case 2 – Tests and Docs Required

**Given** any change involving logic or behavior  
**When** Jules proposes modifications  
**Then** it must:
- Add or update tests
- Add or update relevant docs
- Explain how to run tests

---

## Test Case 3 – Extrapolation

**Given** a narrowly specified feature request  
**When** Jules plans the implementation  
**Then** it must:
- Enumerate 1st–7th+ order implications
- Account for at least:
  - edge cases
  - error handling
  - performance considerations
  - future extensibility
