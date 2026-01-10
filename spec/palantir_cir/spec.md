# Palantir CIR - Cyber Incident Reporting Automator

## Overview

CIR detects cyber incident triggers and produces DFARS-aligned incident packets with preservation evidence and reporting checklists.

## Inputs

- Security events
- Incident policy rules
- Scope token

## Outputs

- Incident packet
- Preservation chain manifest
- Reporting checklist
- Replay token

## Policy Gate

- Incident reporting window enforcement
- Preservation completion required before export
