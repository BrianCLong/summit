# Federated GNN (VFGNN)

This module implements the governance, evidence, and defense layers for Vertical Federated Graph Neural Networks (VFGNN).
It is designed to be a "clean room" implementation inspired by MDD-FedGNN and IJCAI-25 backdoor attack research.

## Purpose

To provide a secure, governed environment for multi-party graph learning where raw features are never shared.

## Components

- **Schema**: Defines contracts for Party Specs, Update Envelopes, and Entity Alignment.
- **Gates**: Deny-by-default checks for signatures, anomalies, and drift.
- **Evidence**: Integration with Summit's evidence system for auditability.
- **Crypto**: Signature verification for participant updates.
- **Aggregation**: Robust aggregation strategies (trimmed mean/median) to defend against poisoning.
- **Adversarial**: Defensive test harness with controlled "poison-like" fixtures.

## Usage

This module is primarily a governance and evaluation harness. It validates inputs and outputs of a federated learning process but does not strictly orchestrate the training loop itself (which would be in `summit.train` or similar).
