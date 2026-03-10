# Universal AI System Architecture Standards

## Import/Export Matrix
| Standard / concept | Import | Export | Notes |
|---|---|---|---|
| JSON Schema | yes | yes | primary operation contracts |
| tool/function calling contracts | yes | yes | OpenAI / Anthropic style abstraction |
| diff / patch op list | yes | yes | Summit normalized internal form |
| handoff metadata | yes | yes | for multi-agent orchestration |
| eval report JSON | yes | yes | deterministic comparison target |
| approval decision JSON | yes | yes | runtime governance |

## Non-goals
- no vendor SDK lock-in
- no direct proprietary UI/state model cloning
- no remote design/doc/code platform integration in this plan
- no claims of parity with vendor feature depth
