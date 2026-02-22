# RU-UA Cognitive Warfare Campaign Spec (ru-ua-cogwar-lab)

## Purpose

Define a deterministic, schema-validated Cognitive Campaign Spec for encoding narrative/tactic
patterns observed in Russia–Ukraine cognitive warfare, aligned to NATO/EU terminology and grounded
in public reporting. This standard produces reusable artifacts for IntelGraph investigations.

## Summit Readiness Assertion

This work aligns with the Summit Readiness Assertion and uses governed artifacts and deterministic
outputs to shorten feedback loops and enforce evidence-first workflows.

## Scope

- Encode campaigns as structured objects (`actors`, `channels`, `narratives`, `timing`,
  `indicators`, `attribution`, `evidence`).
- Support narrative families and tactic packs (e.g., nuclear rhetoric, anti-NATO framing,
  cloned/typosquatted sites, bot amplification).
- No automated attribution beyond documented sources; default to `UNATTRIBUTED`.

## Terminology Alignment

- **Cognitive warfare**: Exploits cognitive domains to undermine or influence decision-making,
  aligned to NATO CSRR framing.
- **Information Manipulation Set (IMS)**: Optional grouping of narratives/tactics inspired by EU
  DisinfoLab taxonomy; used only for grouping and not attribution.

## Schema

- **Schema ID**: `cogwar.campaign.v1`
- **Schema file**: `schemas/cogwar/campaign.v1.schema.json`

### Field Mapping

| Field        | Definition | Source alignment |
| ------------ | ---------- | ---------------- |
| `actors`     | Observed or reported actors, including state, proxies, botnets | Public reporting on cognitive warfare ecosystems | 
| `channels`   | Media and dissemination channels (web/social/messaging) | Described propagation channels | 
| `narratives` | Narrative themes + frames | Narrative clusters (nuclear/dirty bomb, anti-NATO) |
| `timing`     | Event hooks (summits, aid announcements) | Temporal/event-based analysis |
| `indicators` | Deterministic matching patterns (keywords, typosquat domains) | Tactic observations |
| `attribution` | Defaults to `UNATTRIBUTED`; evidence required for `ATTRIBUTED` | DOJ/DOD public attribution only |
| `evidence`   | Evidence references with source and locator | Public sources |

## Interop & Standards Mapping

### Imports (inputs)

- OSINT narratives (text snippets, URLs, platform metadata)
- Domain intelligence (typosquat indicators, DNS/WHOIS if already supported)
- Event calendar markers (e.g., NATO summits, aid announcements) represented as references only

### Exports (outputs)

- IntelGraph Campaign entity JSON (this spec)
- Optional Neo4j-ready edge list (if supported by existing connectors)
- Analyst-facing indicator match report (deterministic)

### Non-goals

- Automated attribution beyond cited sources
- Automated generation of disinformation content
- Autonomous collection from restricted/private sources

## Threat-Informed Requirements

- **Attribution laundering**: Require `confidence` and `evidence_refs[]` for `ATTRIBUTED` status.
- **PII leakage**: Forbid raw content unless `data_classification=PUBLIC_OK` is explicitly set.
- **Prompt injection**: Treat LLM outputs as untrusted; sanitize/escape all report rendering.
- **Noise flooding**: Enforce indicator list size caps and validation limits.

## MAESTRO Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: attribution laundering, prompt injection, PII leakage, noise flooding.
- **Mitigations**: schema gates, evidence requirements, redaction rules, deterministic caps.

## Source Index

- PMC case study on narrative shifts vs events and narrative clusters:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC12460417/
- Spravdi overview of cognitive warfare ecosystem:
  https://spravdi.org/en/cognitive-warfare-why-ukraines-experience-is-ahead-of-nato-doctrines/
- EU DisinfoLab Doppelgänger hub:
  https://www.disinfo.eu/doppelganger-hub/
- US DOJ domain seizure press release:
  https://www.justice.gov/archives/opa/pr/justice-department-disrupts-covert-russian-government-sponsored-foreign-malign-influence
- US Cyber Command Doppelgänger write-up:
  https://www.cybercom.mil/Media/News/Article/3895345/russian-disinformation-campaign-doppelgnger-unmasked-a-web-of-deception/
- NATO CSRR cognitive warfare definition:
  https://www.nato.int/
- Cipher Brief narrative framing:
  https://www.thecipherbrief.com/russia-narratives-ukraine

## Status

- **Deterministic outputs**: required
- **Feature flag**: default OFF for any ingestion/scoring changes
- **Roll-forward**: incremental narrative/tactic pack additions without schema bump when compatible
