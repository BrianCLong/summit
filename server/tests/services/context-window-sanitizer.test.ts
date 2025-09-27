import {
  ContextWindowSanitizer,
  RetrievalChunk,
} from "../../src/services/context-window-sanitizer.js";

describe("ContextWindowSanitizer", () => {
  const sanitizer = new ContextWindowSanitizer();

  const seededChunks: RetrievalChunk[] = [
    {
      id: "doc-001",
      type: "document",
      content:
        "Primary contact: Eve Smith <eve.smith@example.com> SSN 123-45-6789. [SPOM:P]DOB 02/12/1984[/SPOM] extracted from CRM export.",
      metadata: {
        source: "crm",
        analystNote: "Contains PII",
        internalRef: "PII-123",
        spomTags: ["P", "S"],
        score: 0.92,
      },
      score: 0.92,
    },
    {
      id: "doc-002",
      type: "document",
      content:
        "Mission brief: [SPOM:M]Strike at 04:30 local via ingress ALPHA-4 door 12B[/SPOM]. Confidence remains high despite window adjustments.",
      metadata: {
        source: "ops-center",
        attachments: ["brief.pdf"],
        spomTags: ["M", "O"],
        score: 0.81,
      },
      score: 0.81,
    },
    {
      id: "doc-003",
      type: "document",
      content:
        "Summary intelligence indicates objective Neptune remains secure. Response team Beta confirmed via encrypted channel 7.",
      metadata: {
        source: "intel-stream",
        score: 0.74,
      },
      score: 0.74,
    },
  ];

  it("sanitizes retrieval chunks while preserving answerability and reducing exposure", () => {
    const result = sanitizer.sanitize(seededChunks, {
      purpose: "analysis",
      question: "What is the operational status?",
    });

    const sanitizedText = result.sanitizedChunks.map((chunk) => chunk.content).join(" ");

    expect(sanitizedText).not.toMatch(/\d{3}-\d{2}-\d{4}/);
    expect(sanitizedText).not.toContain("eve.smith@example.com");
    expect(result.quality.answerability.retention).toBeGreaterThanOrEqual(0.8);
    expect(result.quality.exposure.reduction).toBeGreaterThan(0);
    expect(result.quality.status).toBe("balanced");
    expect(result.explainTraces).toMatchInlineSnapshot(`
{
  "doc-001": {
    "minimization": "Removed metadata fields: analystNote, internalRef",
    "quality": {
      "answerability": 1.8,
      "exposure": 0.083,
    },
    "redactions": [
      "SPOM-Personal: DOB 02/12/1984",
      "SSN:123-45-6789",
      "Email:eve.smith@example.com",
    ],
    "truncation": null,
  },
  "doc-002": {
    "minimization": "Removed metadata fields: attachments",
    "quality": {
      "answerability": 0.923,
      "exposure": 0.25,
    },
    "redactions": [
      "SPOM-Mission: Strike at 04:30 local via ingress ALPHA-4 door 12B",
      "Operational:window adjustments",
    ],
    "truncation": null,
  },
  "doc-003": {
    "minimization": "Metadata already minimal",
    "quality": {
      "answerability": 1,
      "exposure": 0,
    },
    "redactions": [],
    "truncation": null,
  },
}
`);
    expect(result.fingerprint).toMatch(/^[0-9a-f]{16}$/);
  });

  it("produces a deterministic golden prompt for sanitized context", () => {
    const question = "Summarize the current mission posture.";
    const { sanitizedChunks } = sanitizer.sanitize(seededChunks, {
      purpose: "analysis",
      question,
    });

    const goldenPrompt = [
      "You are a retrieval assistant. Use only the provided chunks.",
      "CONTEXT:",
      ...sanitizedChunks.map(
        (chunk) => `- ${chunk.type.toUpperCase()} ${chunk.id}: ${chunk.content}`,
      ),
      `QUESTION: ${question}`,
    ].join("\n");

    expect(goldenPrompt).toEqual(
      "You are a retrieval assistant. Use only the provided chunks.\n" +
        "CONTEXT:\n" +
        "- DOCUMENT doc-001: Primary contact: Eve Smith <[REDACTED Email approx 1 tokens]> SSN [REDACTED SSN approx 1 tokens]. [REDACTED Personal approx 2 tokens] extracted from CRM export.\n" +
        "- DOCUMENT doc-002: Mission brief: [REDACTED Mission approx 7 tokens]. Confidence remains high despite [REDACTED Operational approx 2 tokens].\n" +
        "- DOCUMENT doc-003: Summary intelligence indicates objective Neptune remains secure. Response team Beta confirmed via encrypted channel 7.\n" +
        "QUESTION: Summarize the current mission posture.",
    );
  });

  it("applies purpose-aware truncation for summarization budgets", () => {
    const longChunk: RetrievalChunk = {
      id: "doc-004",
      type: "document",
      content: new Array(200)
        .fill(
          "Extended analysis window identifies residual chatter across nodes with minimal operational relevance."
        )
        .join(" "),
      metadata: { source: "analysis", score: 0.55 },
      score: 0.55,
    };

    const { sanitizedChunks } = sanitizer.sanitize([longChunk], {
      purpose: "summarization",
      question: "Provide highlights.",
    });

    expect(sanitizedChunks[0].content.length).toBeLessThanOrEqual(420 + 3); // includes ellipsis
    expect(sanitizedChunks[0].truncated).toBe(true);
    expect(sanitizedChunks[0].explain.truncation).toBe(
      "Truncated to 420 characters for summarization purpose",
    );
  });
});
