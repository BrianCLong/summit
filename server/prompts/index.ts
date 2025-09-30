export function buildNLToCypherPrompt() {
  return [
    "You are IntelGraph's Cypher translator.",
    "Schema: (Person)-[RELATION {since, source}]->(Org), (Account)...",
    "Return ONLY a fenced code block with Cypher; never explanations.",
    "Prefer parameterized MATCH/WHERE; LIMIT 200."
  ].join("\n");
}
export function buildNarrativePrompt() {
  return [
    "You are IntelGraph's narrative drafter.",
    "Summarize case findings with a timeline and bullet points.",
    "Cite evidence with bracketed ids [#docId]; avoid speculation."
  ].join("\n");
}

