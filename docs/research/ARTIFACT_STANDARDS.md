# Research Artifact Standards

## 1. Principle: Clarity and Intellectual Honesty

The purpose of a research artifact is to clearly and honestly document the findings of an exploratory effort. Artifacts are valued for the knowledge they contain, not as precursors to production features. Every artifact must be self-contained and transparent about its own scope, assumptions, and limitations.

## 2. Approved Artifact Types

The Research Track will produce artifacts of the following types.

### 2.1. Whitepapers

- **Purpose:** To present a detailed theoretical or conceptual exploration of a topic.
- **Structure:** Must include an abstract, introduction, methodology, findings, and a conclusion.
- **Key Requirement:** Must include a dedicated section on "Limitations and Further Questions."

### 2.2. Simulations

- **Purpose:** To model the behavior of a system or algorithm under a specific set of conditions.
- **Format:** The artifact consists of the simulation code, the data used to run it, and a detailed `README.md` file that explains how to run the simulation and interpret the results.
- **Key Requirement:** The `README.md` must explicitly state the parameters of the simulation and why they were chosen.

### 2.3. Formal Models

- **Purpose:** To provide a mathematically rigorous definition of a system or process.
- **Format:** A document containing the formal specification (e.g., in TLA+, Alloy, or similar notation) and a plain-language explanation of the model.
- **Key Requirement:** Must be accompanied by a proof of its properties, or a clear statement of which properties have been proven and which are conjectured.

### 2.4. Experimental Prompts

- **Purpose:** To document experiments in interacting with Large Language Models or other generative AI systems.
- **Format:** A structured document that includes the exact prompt(s) used, the model(s) they were tested against, the results obtained, and an analysis of the findings.
- **Key Requirement:** Must include a section on "Observed Failure Modes" that documents how and when the prompts failed to produce the desired output.

### 2.5. Proof-of-Concept Code (Non-Deployable)

- **Purpose:** To demonstrate the technical feasibility of a specific, narrow concept.
- **Format:** A small, self-contained codebase in a dedicated research repository.
- **Key Requirement:** The repository's `README.md` file must begin with the following boilerplate disclaimer, verbatim:
  ```
  **WARNING: PROOF-OF-CONCEPT - DO NOT DEPLOY**
  This codebase is a non-deployable proof-of-concept created for research purposes only. It is not built to production standards, has not undergone security or compliance reviews, and must not be used in any production or pre-production environment. Refer to the Research Graduation Rules for the policy on transitioning concepts from research to production.
  ```

## 3. Required Metadata

Every research artifact, regardless of its type, must be accompanied by a metadata file or a header section that explicitly states the following:

1.  **Assumptions:** A clear and concise list of the core assumptions on which the research is based.
2.  **Limitations:** An honest assessment of the boundaries and limitations of the work. What can it not do? Where might its conclusions be invalid?
3.  **Explicit Non-Claims:** A statement of what this research does _not_ claim to be or do. For example, "This work does not claim to be a scalable solution," or "This analysis does not imply a recommendation for any specific product change."
