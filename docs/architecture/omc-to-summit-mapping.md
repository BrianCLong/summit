# OMC → Summit Mapping (Public Sources)

## Verified Facts (with sources)
- **Execution modes**: Autopilot, Ultrawork, Ultrapilot, Ecomode, Swarm,
  Pipeline are listed as OMC execution modes. Source:
  https://raw.githubusercontent.com/Yeachan-Heo/oh-my-claudecode/main/README.md
- **Magic keywords**: `autopilot`, `ralph`, `ulw`, `eco`, `plan`, `ralplan`
  appear as control keywords. Source:
  https://raw.githubusercontent.com/Yeachan-Heo/oh-my-claudecode/main/README.md
- **Specialized agents + routing**: OMC advertises 32 specialized agents and
  smart model routing. Source:
  https://raw.githubusercontent.com/Yeachan-Heo/oh-my-claudecode/main/README.md
- **Hook field compatibility**: OMC updated hook scripts to accept snake_case
  fields (`tool_name`, `tool_input`, `tool_response`, `session_id`, `cwd`) with
  camelCase fallback. Source:
  https://raw.githubusercontent.com/Yeachan-Heo/oh-my-claudecode/main/CHANGELOG.md

## Assumptions (with validation plan)
- **Trace/report structure**: OMC exposes a `/trace` command that produces a
  structured timeline report.
  - Validation plan: locate the command in public docs or release notes, then
    capture the report schema and map it into `report.json`.

## Event/Hooks Field Mapping
| OMC Field | Summit Normalized Field |
| --- | --- |
| `tool_name` / `toolName` | `toolName` |
| `tool_input` / `toolInput` | `toolInput` |
| `tool_response` / `toolOutput` | `toolOutput` |
| `session_id` / `sessionId` | `sessionId` |
| `cwd` / `directory` | `directory` |

## Mode Mapping (OMC → Summit Strategies)
| OMC Mode | Summit Strategy Profile |
| --- | --- |
| Autopilot | `autopilot` |
| Ultrawork | `swarm` (parallel) |
| Ultrapilot | `pipeline` (multi-stage) |
| Ecomode | `eco` |
| Swarm | `swarm` |
| Pipeline | `pipeline` |

## Minimal Allowlist (Initial)
- AgentStart
- AgentStop
- TaskCreate
- TaskUpdate
- TaskComplete
- TaskError
- ToolUse
- ToolResult
