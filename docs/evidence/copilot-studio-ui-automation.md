# Evidence: Microsoft Copilot Studio - Computer-Using Agents

**Source URL:** [https://www.microsoft.com/en-us/microsoft-copilot/blog/copilot-studio/computer-using-agents-now-deliver-more-secure-ui-automation-at-scale/](https://www.microsoft.com/en-us/microsoft-copilot/blog/copilot-studio/computer-using-agents-now-deliver-more-secure-ui-automation-at-scale/)
**Date:** Feb 24, 2026 (Feature Release)
**Author:** Mustapha Lazrek, Principal Product Management Manager

## Executive Summary
Microsoft has announced updates to "Computer-using agents" (CUAs) in Copilot Studio, emphasizing security, governance, and scale. This evidence file supports the "ui-automation-subsumption" initiative in Summit.

## Claims Registry

### ITEM:CLAIM-01
**Claim:** "Computer-using agents" perform UI automation across applications.
**Quote:**
> "AI that can see, understand, and act across web and desktop apps—just like a person would."
> "Computer-using agents in Microsoft Copilot Studio now offer more model choice... so you can automate more of your work across web and desktop apps with confidence."

### ITEM:CLAIM-02
**Claim:** Emphasis on security, governance, and enterprise controls.
**Quote:**
> "Computer use now offers built‑in credentials so agents can: Securely perform website and desktop app logins... Reuse them across multiple agents and automations."
> "Credentials are encrypted and are never exposed to the AI model, so only authorized agents can access them."
> "Computer use now has advanced monitoring and richer observability, so operations, security, and compliance teams can inspect behavior step‑by‑step."

### ITEM:CLAIM-03
**Claim:** Designed for automation at scale.
**Quote:**
> "Scaling UI automation shouldn’t require managing fleets of desktops or fragile virtual machines."
> "The new Cloud PC pool, powered by Windows 365 for Agents, provides fully managed cloud‑hosted machines... designed for computer use runs and built to scale with demand."

### ITEM:CLAIM-04
**Claim:** Positioned within Copilot Studio as an extension of agent workflows.
**Quote:**
> "Create, customize, deploy, and manage your agents with Copilot Studio."
> "Go to Tools → Add tool → New tool and select computer use."

### ITEM:CLAIM-05
**Claim:** Focus on safer automation vs brittle RPA-style approaches.
**Quote:**
> "Early adopters quickly put CUAs to work automating brittle processes, navigating legacy systems, and stitching together workflows where APIs don’t exist."
> "Now, the RPA stays the same, while a CUA handles the variable UI portions—navigating changing layouts, interpreting dialogs, and escalating edge cases."

## Implications for Summit
Summit's `ui_automation` module must mirror these capabilities but with "OSS, verifiable, deterministic" guarantees:
1.  **Policy-gated runner** (matching CLAIM-02).
2.  **Evidence artifacts** (matching CLAIM-02 "richer observability").
3.  **Scalable harness** (matching CLAIM-03).
