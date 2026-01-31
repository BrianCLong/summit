# Kimi K2.5 Integration Standards

## Overview
Integration of Moonshot AI's Kimi K2.5 model (identifier `moonshotai/Kimi-K2.5`) into Summit.

## Import/Export Matrix

*   **Input**: OpenAI Chat Completions schema.
    *   `messages[]`
    *   `tools` (optional)
    *   `content[]` with `image_url` (multimodal support)
*   **Output**: OpenAI-style `choices[].message`.
    *   `finish_reason`
    *   `tool_calls`
    *   Parsed into Summit's internal ToolCall representation.

## Claims & Capabilities
*   **Context Window**: 256K tokens (native INT4 quantization).
*   **Multimodal**: Native multimodal agentic model (MoonViT).
*   **Tool Use**: Stable tool-use across 200–300 sequential calls.
*   **Endpoints**:
    *   **Moonshot**: Primary runtime (`https://api.moonshot.cn/v1`).
    *   **Together**: Optional, behind feature flag (`https://api.together.xyz/v1`).

## Non-Goals
*   Not implementing "agent swarm" orchestration as a first-class runtime feature here.
*   Not supporting non-OpenAI-compatible endpoints.
