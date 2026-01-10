# Attestation

## Purpose

Cryptographic attestation that evidence pack generation or connector execution occurred in a trusted environment.

## Required Fields

- Attestation quote
- Measurement hash
- Key identifier
- Timestamp

## Policy Gate

- Attestation required for releasability packs and connector execution.
- Validation logged to transparency log.
