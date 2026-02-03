# NVIDIA NIM provider (trial)
## Safety defaults
- Multimodal disabled by default.
- Do not persist reasoning traces by default.
- Use only in dev/staging unless policy allows production.

## Configuration
- `NVIDIA_NIM_API_KEY`: Your NVIDIA API key from build.nvidia.com
- `NVIDIA_NIM_BASE_URL`: Defaults to `https://integrate.api.nvidia.com/v1`
- `NVIDIA_NIM_MODEL`: Defaults to `moonshotai/kimi-k2.5`
- `NVIDIA_NIM_MULTIMODAL`: Set to `true` to enable multimodal support (default: false)

## Mode Selection
The provider supports two modes:
- `instant`: High-speed response with thinking disabled.
- `thinking`: Reasoning-enabled mode for complex tasks.

The orchestrator automatically selects `thinking` for agentic tasks or long prompts, and `instant` otherwise.
