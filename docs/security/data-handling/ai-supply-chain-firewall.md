# AI Supply Chain Firewall Data Handling Rules

This document outlines the strict data classification and logging policies for the AI Supply Chain Firewall.

## Never Log

* Prompts, source code, tokens, secrets.
* Full dependency graphs with internal package names (store cryptographic hashes instead).
* Developer identity fields.

## Retention

* Evidence artifacts: 30 days (configurable).
* Aggregate metrics: 90 days.
* Raw "AI suggested dependency" strings: Store only in hashed form unless the user explicitly opts in.
