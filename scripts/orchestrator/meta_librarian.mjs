#!/usr/bin/env node
/**
 * Summit Meta-Librarian (Context Compression Engine)
 * 
 * FAANG-Level Context Optimization:
 * Over time, SAFE (the Autodidactic engine) appends hundreds of rules to `AGENT_DIRECTIVES.md`.
 * This causes Context Collapse: higher token costs, latency, and AI hallucinations due to 
 * contradictory or overlapping rules.
 * 
 * The Meta-Librarian periodically reads the raw learnings, uses an LLM with a massive context window,
 * and compiles them into a perfectly dense, deduplicated `GOLDEN_CONTEXT.md` that all 
 * coding agents must use as their system prompt.
 */

import fs from "node:fs/promises";

const token = process.env.GITHUB_TOKEN;
const repoEnv = process.env.REPO;

async function callAI(prompt, apiKey, provider) {
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await res.json();
    return data.content[0].text;
  } else if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "system", content: prompt }]
      })
    });
    const data = await res.json();
    return data.choices[0].message.content;
  }
  return null;
}

async function main() {
  console.log("Waking up Meta-Librarian to compress Agent Context...");

  let rawDirectives = "";
  try {
    rawDirectives = await fs.readFile(".learnings/AGENT_DIRECTIVES.md", "utf8");
  } catch (e) {
    console.log("No AGENT_DIRECTIVES.md found. Nothing to compress.");
    return;
  }

  if (rawDirectives.length < 500) {
    console.log("Directives are small enough. Skipping compression.");
    return;
  }

  const prompt = `You are the Summit Meta-Librarian. Your job is Context Compression.
Read the following raw chronological learnings extracted from AI agent failures.
Your task is to:
1. Deduplicate repeated rules.
2. Resolve contradictions (newer rules override older rules).
3. Group related rules under clear architectural headers.
4. Compress the text to be as token-dense and unambiguous as possible for a coding LLM to read.

Output ONLY the final Markdown document. No preambles. Start with "# Summit Golden Context".

RAW DIRECTIVES TO COMPRESS:
${rawDirectives}`;

  let compressedContext = null;
  if (process.env.ANTHROPIC_API_KEY) {
    compressedContext = await callAI(prompt, process.env.ANTHROPIC_API_KEY, "anthropic");
  } else if (process.env.OPENAI_API_KEY) {
    compressedContext = await callAI(prompt, process.env.OPENAI_API_KEY, "openai");
  } else {
    console.log("No AI key available for Meta-Librarian.");
    return;
  }

  if (compressedContext) {
    // Strip markdown code blocks if the LLM wrapped the whole response in them
    let cleanContext = compressedContext;
    if (cleanContext.startsWith("\`\`\`markdown")) {
        cleanContext = cleanContext.replace(/^\`\`\`markdown\n/, "").replace(/\n\`\`\`$/, "");
    }

    const goldenPath = ".learnings/GOLDEN_CONTEXT.md";
    await fs.writeFile(goldenPath, cleanContext);
    console.log(`\nSuccessfully compressed context into ${goldenPath}. Reduced token bloat for all future AI operations.`);
  }
}

main().catch(console.error);
