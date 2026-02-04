# Policy Distribution Model

This document describes the model for distributing and enforcing policies across multiple repositories in the Summit ecosystem.

## 1. Overview

The goal of the policy distribution model is to ensure that all repositories adhere to a consistent set of policies, while still allowing for repository-specific customizations when necessary. This is achieved through a combination of a central policy repository and a mechanism for synchronizing policies to individual repositories.

## 2. Central Policy Repository

The `BrianCLong/summit` repository serves as the central policy repository. It contains the canonical policies for the entire ecosystem, organized into policy packs.

## 3. Policy Packs

Policy packs are collections of related policies, organized by domain (e.g., security, ops, compliance). Each policy pack is a directory containing one or more policy files.

## 4. Policy Synchronization

Policies are synchronized from the central repository to individual repositories using the `scripts/federation/sync_policies.ts` script. This script can be run manually or as part of a CI/CD pipeline.

## 5. Policy Overrides

Individual repositories can override the canonical policies by creating a `.policy-overrides` directory in their root. This directory can contain repository-specific policy files that will be applied on top of the canonical policies.

## 6. Drift Detection

Policy drift is detected using the `scripts/federation/detect_policy_drift.ts` script. This script compares the policies in each repository to the canonical policies and reports any discrepancies.
