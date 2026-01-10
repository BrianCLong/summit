# SpiderFoot CEG - Coalition Egress Guard

## Overview

CEG gates OSINT execution with scope tokens and egress policies, emitting disclosure receipts for audit.

## Inputs

- OSINT request + target
- Scope token
- Egress policy

## Outputs

- Selective disclosure results
- Egress receipt
- Replay token

## Policy Gate

- Scope token validation
- Egress budget enforcement
- Active probing restrictions
