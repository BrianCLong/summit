# Design Document: Upstreaming DeepSeek-OCR-2 to vLLM

## Context
DeepSeek-OCR-2 uses the `DeepseekOCR2ForCausalLM` architecture, which is currently not in the vLLM supported model registry. Users are forced to use `--trust-remote-code`, which is a security risk.

## Clean-Room Implementation Plan
To support OCR2 natively in vLLM without relying on remote code, we plan to:
1. **Analyze public modeling code**: Review the open-source implementation of DeepSeek-OCR-2.
2. **Re-implement in vLLM**: Create a compatible `DeepseekOCR2ForCausalLM` implementation within vLLM using vLLM's internal primitives (e.g., PagedAttention, specialized kernels).
3. **Register the Architecture**: Use vLLM's ModelRegistry to map the architecture name to the new implementation.

## Security Considerations
- By upstreaming the implementation, we eliminate the need for `--trust-remote-code` at runtime.
- All code will be reviewed for supply-chain integrity.

## Roadmap
- Phase 1: Experimental stub in Summit (Done).
- Phase 2: Local prototype using vLLM custom model registration.
- Phase 3: Pull Request to upstream vLLM repository.
