# Summit Black-Box Compatibility

This module implements a GraphRAG strategy compatible with "black-box" LLM APIs (like OpenAI, Claude, etc.) where access to model weights for fine-tuning is impossible.

It follows the principles from [arXiv:2511.05297](https://arxiv.org/html/2511.05297):
- **No Fine-Tuning**: No trained adapters, projection layers, or GNN encoders.
- **Deterministic Indexing**: Graph construction is handled by deterministic rules.
- **Prompt Contract**: Strict instructions to the LLM to prevent hallucination.
- **Output Validation**: Post-hoc verification of citations.

## Components

### Prompt Contract
Located in `summit_rt/blackbox/prompt_contract.md`. It enforces:
- "No guessing" policy.
- Mandatory citations (NodeID/EdgeID).
- Fallback to "I don't know" if context is missing.

### Output Validator
Located in `summit_rt/blackbox/output_validator.py`.
It checks if the LLM output actually adheres to the contract, specifically verifying that steps contain valid citations from the context.

## Usage

```python
from summit_rt.blackbox import assemble, serialize, validate_steps

# 1. Serialize Subgraph
context_str = serialize(nodes, edges, max_chars=8000)

# 2. Assemble Prompt
contract = open("summit_rt/blackbox/prompt_contract.md").read()
prompt = assemble(contract_md=contract, serialized_subgraph=context_str, user_query="...")

# 3. Call LLM (black box)
response = llm.generate(prompt.system, prompt.user)

# 4. Validate
errors = validate_steps(response)
if errors:
    handle_failure(errors)
```
