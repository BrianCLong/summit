# Narrative Generation System

## Overview

A modular pipeline that generates emotionally persuasive narratives aligned with specific mission objectives. The system leverages fine-tuned large language models (LLMs) and optional reinforcement learning from human feedback (RLHF) to craft targeted messages. An evaluation layer scores each candidate for clarity, emotional impact, and expected resonance with defined audience profiles. Output includes recommended dissemination formats such as tweets, memes, speeches, or video scripts.

## Inputs

- **Mission Theme:** Core objective or storyline to advance.
- **Audience Psychographic Profile:** Key traits such as values, cognitive style, risk tolerance, and media preferences.

## Generation Pipeline

1. **Prompt Assembly**
   - Combine mission theme, audience profile, and style constraints into a structured prompt.
2. **LLM Candidate Generation**
   - Use a fine-tuned LLM to produce multiple narrative candidates.
   - Optional RLHF loop allows analysts to rank or edit outputs, refining the model over time.
3. **Content Normalization**
   - Clean and structure text, extracting metadata like tone, length, and key motifs.

## Evaluation Layer

Each candidate is scored along three axes:

| Metric                 | Description                                                                         | Example Techniques                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Clarity**            | Narrative coherence and readability.                                                | Readability indices, semantic similarity to prompt, grammar checks.                |
| **Emotional Impact**   | Ability to evoke targeted emotions.                                                 | Sentiment analysis, emotion classifiers, intensity heuristics.                     |
| **Audience Resonance** | Likelihood of aligning with audience beliefs and disrupting adversarial OODA loops. | Psychographic matching, cultural references, attitudinal change likelihood models. |

Scores are aggregated into a behavioral impact index that weights factors according to mission priorities.

## Format Recommendation

Based on length, tone, and impact scores, the system suggests an optimal delivery format:

- **Tweet:** High clarity, concise emotional punch.
- **Meme:** Strong emotion with high shareability among visual-preferring profiles.
- **Speech:** Complex narratives requiring high clarity and deep resonance.
- **Video Script:** Multi-sensory impact with room for narrative arcs.

## Output Schema

```json
{
  "narratives": [
    {
      "text": "...",
      "scores": {
        "clarity": 0.92,
        "emotionalImpact": 0.85,
        "audienceResonance": 0.88,
        "behavioralImpact": 0.89
      },
      "recommendedFormat": "tweet"
    }
  ]
}
```

## RLHF Loop

Human reviewers can approve, reject, or edit candidates. These interactions feed a reinforcement learning loop that fine-tunes the model toward narratives that consistently disrupt adversary OODA loops or increase attitudinal change likelihood.

## Integration Notes

- Expose generation and evaluation via a REST or GraphQL endpoint for easy integration.
- Log prompts, outputs, and scores for audit and future model training.
