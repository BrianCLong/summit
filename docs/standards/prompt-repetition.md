# Prompt Repetition Standard

## Overview
Prompt repetition can measurably improve model responses when structured properly, but naive repetition degrades performance.

## Policy
- The PRPM module classifies repetition patterns as benign, beneficial, or harmful.
- Harmful repetition is blocked in CI.
- Controlled constraint reinforcement transforms are applied when appropriate.
