# NVIDIA NIM provider (trial)

Integration with NVIDIA NIM trial endpoints for Moonshot AI's Kimi K2.5.

## Endpoint Details
- **Base URL**: `https://integrate.api.nvidia.com/v1`
- **Model ID**: `moonshotai/kimi-k2.5`
- **Compatibility**: OpenAI-compatible `POST /chat/completions`

## Safety defaults
- **Multimodal**: Disabled by default. Must be explicitly enabled via config.
- **Reasoning Traces**: Do not persist `reasoning_content` in long-term logs by default.
- **Environment**: Use only in `dev` or `staging` environments. Production use requires explicit approval and policy override due to trial terms.

## Configuration
See `config/providers/nvidia_nim.schema.json` for configuration options.
