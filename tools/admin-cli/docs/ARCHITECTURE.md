# Admin CLI Architecture

## System Context

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              INTELGRAPH PLATFORM                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐  │
│  │   Summit Admin     │     │    IntelGraph      │     │    Monitoring      │  │
│  │       CLI          │────▶│    Admin API       │────▶│     Stack          │  │
│  │                    │     │                    │     │                    │  │
│  │  • env commands    │     │  • /admin/*        │     │  • Prometheus      │  │
│  │  • tenant commands │     │  • /health/*       │     │  • Grafana         │  │
│  │  • data commands   │     │  • /metrics        │     │  • Jaeger          │  │
│  │  • security cmds   │     │                    │     │                    │  │
│  │  • graph commands  │     └─────────┬──────────┘     └────────────────────┘  │
│  └─────────┬──────────┘               │                                         │
│            │                          │                                         │
│            │                          ▼                                         │
│            │              ┌────────────────────────────────────────────┐        │
│            │              │              Data Layer                     │        │
│            │              │  ┌──────────┐ ┌──────────┐ ┌──────────┐   │        │
│            │              │  │PostgreSQL│ │  Neo4j   │ │  Redis   │   │        │
│            │              │  │  (Users, │ │ (Graph)  │ │ (Cache)  │   │        │
│            │              │  │  Audit)  │ │          │ │          │   │        │
│            │              │  └──────────┘ └──────────┘ └──────────┘   │        │
│            │              └────────────────────────────────────────────┘        │
│            │                                                                    │
│            ▼                                                                    │
│  ┌────────────────────┐                                                        │
│  │    Audit Service   │                                                        │
│  │                    │                                                        │
│  │  • Immutable log   │                                                        │
│  │  • Compliance      │                                                        │
│  │  • Retention       │                                                        │
│  └────────────────────┘                                                        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            ADMIN CLI COMPONENTS                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                           CLI Entry Point                                │   │
│  │                           (src/cli.ts)                                   │   │
│  │                                                                          │   │
│  │  • Commander.js program setup                                            │   │
│  │  • Global options (--format, --profile, --dry-run, --verbose)           │   │
│  │  • Pre-action hooks (config resolution)                                  │   │
│  │  • Post-action hooks (audit logging)                                     │   │
│  │  • Error handling                                                        │   │
│  └─────────────────────────────┬───────────────────────────────────────────┘   │
│                                │                                                │
│                                ▼                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         Command Modules                                  │   │
│  │                      (src/commands/*.ts)                                 │   │
│  ├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────┤   │
│  │    env      │   tenant    │    data     │  security   │     graph       │   │
│  │             │             │             │             │                 │   │
│  │ • status    │ • list      │ • backfill  │ • keys      │ • stats         │   │
│  │ • health    │ • get       │ • reindex   │ • rotate    │ • health        │   │
│  │ • services  │ • create    │ • verify    │ • policies  │ • query         │   │
│  │ • slo       │ • suspend   │ • status    │ • audit     │ • schema        │   │
│  │             │ • export    │ • cancel    │ • revoke    │ • vacuum        │   │
│  └─────────────┴─────────────┴─────────────┴─────────────┴─────────────────┘   │
│                                │                                                │
│                                ▼                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          Utility Layer                                   │   │
│  │                        (src/utils/*.ts)                                  │   │
│  ├───────────────┬───────────────┬───────────────┬─────────────────────────┤   │
│  │  api-client   │    output     │    config     │      confirm            │   │
│  │               │               │               │                         │   │
│  │ • HTTP client │ • JSON format │ • Profiles    │ • Safety prompts        │   │
│  │ • Retry logic │ • Table format│ • Environment │ • Typed confirmations   │   │
│  │ • Timeouts    │ • YAML format │ • File store  │ • Production guards     │   │
│  │ • Auth headers│ • Colors      │               │                         │   │
│  ├───────────────┼───────────────┼───────────────┼─────────────────────────┤   │
│  │    audit      │    logger     │    types      │      plugins            │   │
│  │               │               │               │                         │   │
│  │ • Event log   │ • Levels      │ • Interfaces  │ • Extension system      │   │
│  │ • Redaction   │ • Formatting  │ • API types   │ • Hook points           │   │
│  │ • Remote send │ • Timestamps  │ • Options     │ • Registry              │   │
│  └───────────────┴───────────────┴───────────────┴─────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           REQUEST FLOW                                        │
└──────────────────────────────────────────────────────────────────────────────┘

    User Input                  CLI Processing                    API Call
    ─────────                   ──────────────                    ────────
         │                            │                               │
         ▼                            │                               │
┌─────────────────┐                   │                               │
│ summit-admin    │                   │                               │
│ --profile prod  │                   │                               │
│ tenant list     │                   │                               │
└────────┬────────┘                   │                               │
         │                            │                               │
         ▼                            ▼                               │
┌─────────────────┐         ┌─────────────────┐                       │
│ Parse Arguments │────────▶│ Resolve Config  │                       │
│                 │         │ • Load profile  │                       │
│ • Command: tenant│        │ • Get endpoint  │                       │
│ • Subcommand: list│       │ • Get token     │                       │
│ • Options: {}   │         │                 │                       │
└─────────────────┘         └────────┬────────┘                       │
                                     │                                │
                                     ▼                                │
                            ┌─────────────────┐                       │
                            │ Pre-Action Hook │                       │
                            │ • Set output fmt│                       │
                            │ • Configure log │                       │
                            └────────┬────────┘                       │
                                     │                                │
                                     ▼                                ▼
                            ┌─────────────────┐             ┌─────────────────┐
                            │ Execute Command │────────────▶│ API Client      │
                            │                 │             │                 │
                            │ • Validation    │             │ • Add auth      │
                            │ • Confirmation  │             │ • Add audit hdr │
                            │ • API call      │             │ • Retry logic   │
                            └────────┬────────┘             └────────┬────────┘
                                     │                               │
                                     │                               ▼
                                     │                      ┌─────────────────┐
                                     │                      │  Admin API      │
                                     │                      │                 │
                                     │                      │ GET /admin/     │
                                     │                      │     tenants     │
                                     │                      └────────┬────────┘
                                     │                               │
                                     ▼                               ▼
                            ┌─────────────────┐             ┌─────────────────┐
                            │ Format Output   │◀────────────│ Response        │
                            │                 │             │                 │
                            │ • JSON/Table    │             │ { items: [...] }│
                            │ • Colors        │             │                 │
                            └────────┬────────┘             └─────────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │ Post-Action Hook│
                            │ • Audit log     │
                            │ • Cleanup       │
                            └────────┬────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │ Exit            │
                            │ • Exit code     │
                            │ • Cleanup       │
                            └─────────────────┘
```

## Security Model

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY ARCHITECTURE                               │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            AUTHENTICATION                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Token Sources (Priority Order):                                            │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                       │
│  │ CLI --token │ ▶ │ Env Var     │ ▶ │ Profile     │                       │
│  │ option      │   │ INTELGRAPH_ │   │ Config      │                       │
│  │             │   │ TOKEN       │   │             │                       │
│  └─────────────┘   └─────────────┘   └─────────────┘                       │
│                                                                              │
│  Token Flow:                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │ Resolve  │───▶│ Validate │───▶│ Add to   │───▶│ Verify   │             │
│  │ Token    │    │ Format   │    │ Header   │    │ Server   │             │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            AUTHORIZATION                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Permission Model:                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Format: resource:action                                              │  │
│  │                                                                        │  │
│  │  Examples:                                                             │  │
│  │  • tenant:read      - View tenant information                         │  │
│  │  • tenant:create    - Create new tenants                              │  │
│  │  • security:rotate  - Rotate security keys                            │  │
│  │  • data:backfill    - Run data backfill operations                    │  │
│  │  • *:*              - Admin wildcard (all permissions)                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Role Mapping:                                                               │
│  ┌──────────┬─────────────────────────────────────────────────────────┐   │
│  │ viewer   │ env:*, tenant:read, graph:read                          │   │
│  ├──────────┼─────────────────────────────────────────────────────────┤   │
│  │ operator │ env:*, tenant:*, data:status, security:audit            │   │
│  ├──────────┼─────────────────────────────────────────────────────────┤   │
│  │ sre      │ env:*, tenant:*, data:*, security:*, graph:*            │   │
│  ├──────────┼─────────────────────────────────────────────────────────┤   │
│  │ admin    │ *:*                                                      │   │
│  └──────────┴─────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            AUDIT TRAIL                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Every CLI operation logs:                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ {                                                                     │  │
│  │   "id": "audit-uuid",                                                 │  │
│  │   "timestamp": "2024-01-15T10:30:00.000Z",                           │  │
│  │   "action": "cli.tenant.create",                                      │  │
│  │   "userId": "user-123",                                               │  │
│  │   "userEmail": "admin@company.com",                                   │  │
│  │   "command": "tenant",                                                │  │
│  │   "args": ["create"],                                                 │  │
│  │   "options": {                                                        │  │
│  │     "name": "Acme Corp",                                              │  │
│  │     "adminEmail": "admin@acme.com",                                   │  │
│  │     "token": "[REDACTED]"    // Sensitive values redacted            │  │
│  │   },                                                                  │  │
│  │   "result": "success",                                                │  │
│  │   "durationMs": 1234,                                                 │  │
│  │   "hostname": "sre-workstation-01",                                   │  │
│  │   "clientVersion": "1.0.0"                                            │  │
│  │ }                                                                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           DEPLOYMENT OPTIONS                                  │
└──────────────────────────────────────────────────────────────────────────────┘

Option 1: NPM Global Install
────────────────────────────
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ npm registry    │───▶│ npm install -g  │───▶│ /usr/local/bin/ │
│                 │    │ @summit/admin   │    │ summit-admin    │
└─────────────────┘    └─────────────────┘    └─────────────────┘

Option 2: Docker Container
──────────────────────────
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Docker Hub      │───▶│ docker pull     │───▶│ docker run      │
│ summit/admin-cli│    │                 │    │ summit-admin    │
└─────────────────┘    └─────────────────┘    └─────────────────┘

Option 3: Kubernetes Job
────────────────────────
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Helm Chart      │───▶│ CronJob/Job     │───▶│ Admin CLI Pod   │
│                 │    │ Definition      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘

Option 4: CI/CD Integration
───────────────────────────
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ GitHub Actions  │───▶│ npx @summit/    │───▶│ Automated       │
│ GitLab CI       │    │ admin-cli       │    │ Operations      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Plugin Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           PLUGIN SYSTEM                                       │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              Core CLI                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        Plugin Registry                                 │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   Built-in  │  │   User      │  │   Team      │  │   Custom    │  │  │
│  │  │   Commands  │  │   Plugins   │  │   Plugins   │  │   Plugins   │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Hook System                                    │  │
│  │                                                                        │  │
│  │  • preCommand     - Before command execution                          │  │
│  │  • postCommand    - After command execution                           │  │
│  │  • onError        - On command error                                  │  │
│  │  • onOutput       - Before output formatting                          │  │
│  │  • onAudit        - Before audit logging                              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

Plugin Interface:
┌──────────────────────────────────────────────────────────────────────────────┐
│  interface AdminCLIPlugin {                                                   │
│    name: string;                                                              │
│    version: string;                                                           │
│    description: string;                                                       │
│                                                                               │
│    // Register new commands                                                   │
│    commands?: (program: Command) => void;                                     │
│                                                                               │
│    // Hook implementations                                                    │
│    hooks?: {                                                                  │
│      preCommand?: (context: CommandContext) => Promise<void>;                │
│      postCommand?: (context: CommandContext, result: any) => Promise<void>; │
│      onError?: (context: CommandContext, error: Error) => Promise<void>;    │
│    };                                                                         │
│  }                                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
```
