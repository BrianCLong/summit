# Prompt Trust Boundary Contract

## Purpose
Enforces the boundary between trusted instructions (system/developer controls) and untrusted data (user input/retrieved context) to prevent prompt injection and privilege escalation.

## Versioning
- Version: 1.0.0
- Schema ID: `summit.prompt.boundary.v1`

## Concepts
- **Control Plane**: System instructions, policies, and tool schemas.
- **Data Plane**: User inputs, retrieved documents, and external context.

## Rules
1. **Explicit Segregation**: Untrusted content MUST be explicitly demarcated (e.g., using XML tags, markdown blocks, or clear boundaries).
2. **Quoting**: Untrusted content MUST NOT be interpolated directly into control plane text without quoting or escaping.
3. **Instruction Invariant**: Untrusted content MUST NOT be able to alter the instruction hierarchy or invoke tools unless explicitly authorized by the control plane.
4. **Tool Authorization**: A prompt that requests a tool invocation must provide evidence of authorization (e.g., matching a declared scope).

## Evidence Structure
A successful validation of a prompt generation step must produce a boundary evidence artifact containing:
- `prompt_hash`: SHA-256 of the final rendered prompt.
- `template_hash`: SHA-256 of the trusted template used.
- `untrusted_inputs`: Array of hashes of the untrusted inputs included.
- `enforcement_method`: String describing the segregation method (e.g., `xml_tags`, `json_schema`).

## Failure Modes
- `unauthorized_tool_intent`: The resulting prompt contains tool invocation requests not authorized by the template.
- `boundary_break`: Untrusted content successfully "escaped" its container (e.g., closing XML tags maliciously).
- `missing_evidence`: The prompt generation step did not produce the required boundary evidence.
