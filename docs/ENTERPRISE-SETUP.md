# 🚀 GitHub Enterprise & n8n Automation Setup - BrianCLong/summit

## Overview

This repo (BrianCLong/summit) is the **source of truth** for Summit development. Changes here automatically sync to TopicalityLLC/Summit for enterprise trial features.

## Architecture

- **BrianCLong/summit**: Primary development repository
- **TopicalityLLC/Summit**: Enterprise mirror with GitHub Enterprise features
- **n8n Workflows**: Automation responding to events in both repos

## Webhooks Configured

### 1. Issue→AI→Deploy Pipeline

- URL: `https://topicality.app.n8n.cloud/webhook-test/97be927c-3970-4cf7-8f91-c2e1706698c7`
- Events: Issues, Issue comments
- Purpose: Auto-analyze issues and generate solutions

### 2. PR Review Swarm

- URL: `https://topicality.app.n8n.cloud/webhook-test/3aacf6a8-99fc-48be-a015-d312a835cdf8`
- Events: Pull requests, Pull request reviews
- Purpose: Multi-AI code review

## Auto-Sync Workflow

The `.github/workflows/mirror-to-enterprise.yml` automatically pushes changes from:

- `main` branch
- `release/**` branches

To: `TopicalityLLC/Summit`

### Required Secret

Add `ENTERPRISE_MIRROR_TOKEN` to repository secrets:

1. Go to Settings → Secrets → Actions
2. Create Personal Access Token with scopes: `repo`, `workflow`
3. Add as `ENTERPRISE_MIRROR_TOKEN`

For full enterprise setup details, see: https://github.com/TopicalityLLC/Summit/blob/main/ENTERPRISE-SETUP.md
