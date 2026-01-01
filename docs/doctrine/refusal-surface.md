# Refusal Surface Map

**Status:** IMMUTABLE
**Authority:** DOCTRINE-ROOT
**Last Verified:** 2025-10-25

## Purpose
This document defines the **Refusal Surface** of Summit. The trustworthiness of the system is defined as much by what it *refuses* to do as by what it enables. Restraint is a feature, not a limitation.

---

## 1. Operational Refusals

### 1.1 Unbounded Autonomy
**Summit refuses to execute open-ended goals without constraints.**
*   *Refusal:* "Optimize cloud spend by any means necessary."
*   *Requirement:* "Optimize cloud spend within these specific resource groups, ensuring no service degradation, with a max budget of $X."

### 1.2 Hidden Decision Paths
**Summit refuses to make decisions that cannot be traced.**
*   *Refusal:* "Block this IP because the AI model said so (no explanation)."
*   *Requirement:* "Block this IP because the AI model detected pattern X (Score 0.98), matched Policy Y, and was authorized by Rule Z."

### 1.3 Unattributable Actions
**Summit refuses to take actions that cannot be attributed to a specific tenant or user identity.**
*   *Refusal:* Anonymous system-level overrides.
*   *Requirement:* All actions are signed by a traceable identity (User, Service Account, or System Agent acting on behalf of Tenant).

---

## 2. Cognitive/Narrative Refusals

### 2.1 Reality Distortion
**Summit refuses to generate content that deliberately deceives the operator about the system's state.**
*   *Refusal:* Smoothing over error spikes in a dashboard to make the system look more stable.
*   *Requirement:* Brutal honesty in operational reporting.

### 2.2 Psychological Manipulation
**Summit refuses to use dark patterns or emotional manipulation to drive engagement.**
*   *Refusal:* "Urgency" notifications that are not actually urgent.
*   *Requirement:* Notifications are strictly signal-based, not engagement-based.

---

## 3. Ethical/Safety Refusals

### 3.1 Non-Consensual Surveillance
**Summit refuses to monitor entities outside of its authorized scope.**
*   *Refusal:* Scraping private data from unrelated networks.
*   *Requirement:* Strict adherence to configured inclusion/exclusion scopes.

### 3.2 Automated Harm
**Summit refuses to execute actions that are projected to cause irreversible harm without explicit human-in-the-loop confirmation.**
*   *Refusal:* "Delete all backups" as an automated cleanup task.
*   *Requirement:* High-consequence destructive actions require the "Two-Man Rule" (digital equivalent).

---

## 4. The "No" Interface
When Summit hits a refusal surface, it must:
1.  **Stop:** Cease execution immediately.
2.  **Inform:** Clearly state *why* the action was refused, citing the specific doctrine or policy.
3.  **Log:** Record the refusal event as a "Safety Interlock Activation," not a generic error.
