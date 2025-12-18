# AI Dev Assistant Prompt System

> **Production-ready prompt template system for the IntelGraph/Summit platform**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

## 🎯 Overview

The AI Dev Assistant Prompt System is a comprehensive, production-ready framework for creating, managing, and using structured prompts for AI-assisted development. It provides:

* **📝 Template Library**: Pre-built templates for common development tasks
* **🔧 CLI Tool**: Interactive and non-interactive modes for prompt generation
* **📊 Analytics**: Track usage, success rates, and effectiveness
* **✅ Validation**: Schema-based template validation
* **🎨 Composition**: Template inheritance and mixins
* **🔌 Integrations**: GitHub, Jira, Linear support

---

## 🚀 Quick Start

### Installation

```bash
# From the project root
cd tools/prompt-system
pnpm install
pnpm build

# Make the CLI globally available
pnpm link --global
```

### Basic Usage

```bash
# Interactive mode (default)
ig-prompt

# List available templates
ig-prompt list

# Show template details
ig-prompt show ui-ux-fix

# Generate prompt non-interactively
ig-prompt generate ui-ux-fix \
  --var title="Filters reset when switching tabs" \
  --var impactWho="All analysts" \
  --var priority=P1

# View usage metrics
ig-prompt metrics
```

---

## 📚 Core Templates

### Core Templates (Production-Ready)

| Template | ID | Use Case |
|----------|-----|----------|
| **UI/UX Fix** | `ui-ux-fix` | High-priority client-facing UI/UX issues |
| **Feature** | `feature-implementation` | Comprehensive feature implementation |
| **Bug Fix** | `bug-fix` | Systematic bug identification and resolution |
| **Refactor** | `refactor` | Code quality improvements |
| **Security Fix** | `security-fix` | Security vulnerability remediation |

### Specialized Templates

| Template | ID | Use Case |
|----------|-----|----------|
| **GraphQL Schema** | `graphql-schema-change` | GraphQL schema evolution |
| **DB Migration** | `db-migration` | PostgreSQL/Neo4j schema migrations |

---

## 📖 Usage Guide

### Interactive Mode

The default mode provides a guided experience:

```bash
ig-prompt
# or
ig-prompt interactive
```

1. Select a template from categorized list
2. Answer prompts for each variable
3. Review generated prompt
4. Copy to clipboard or save to file

### Non-Interactive Mode

For scripting and automation:

```bash
ig-prompt generate <template-id> [options]
```

**Options:**
* `--var <key=value>` - Set template variables
* `--file <path>` - Load variables from JSON/YAML
* `--output <path>` - Save to file
* `--clipboard` - Copy to clipboard
* `--jira` / `--linear` / `--github` - Format for specific platform

**Example:**

```bash
ig-prompt generate bug-fix \
  --var bugTitle="Memory leak in graph renderer" \
  --var severity=high \
  --var frequency=often \
  --output bug-report.md
```

### Loading Variables from File

Create a `variables.yaml`:

```yaml
title: "Filters reset when switching tabs"
impactWho: "All analysts using the Analytics view"
impactWhy: "Blocks critical workflow, causes data loss"
priority: P1
targetRelease: "v1.5.0"
stepsToReproduce: |
  1. Navigate to Analytics > Timeline
  2. Apply filters (date range, entity type)
  3. Switch to another tab
  4. Return to Timeline tab
actualBehavior: "Filters are reset to default"
expectedBehavior: "Filters persist across tab switches"
screenArea: "Analytics > Timeline"
stack: "React + TypeScript + Apollo + MUI"
```

Then:

```bash
ig-prompt generate ui-ux-fix --file variables.yaml
```

---

## 🏗️ Architecture

```
prompt-system/
├── src/
│   ├── core/              # Template system core
│   │   ├── types.ts       # TypeScript types
│   │   ├── validator.ts   # Schema validation
│   │   ├── engine.ts      # Handlebars rendering
│   │   ├── registry.ts    # Template management
│   │   └── composer.ts    # Template composition
│   ├── cli/               # Command-line interface
│   │   ├── index.ts       # CLI entry point
│   │   ├── interactive.ts # Interactive selector
│   │   ├── generator.ts   # Non-interactive generator
│   │   └── context.ts     # Codebase context injection
│   └── metrics/           # Analytics system
│       ├── tracker.ts     # Usage tracking
│       ├── analytics.ts   # Analytics engine
│       └── reporter.ts    # Metrics reporting
├── templates/
│   ├── core/              # Core templates
│   ├── specialized/       # Specialized templates
│   ├── meta/              # Meta templates
│   └── custom/            # Custom templates
├── schemas/
│   └── template.schema.json
└── docs/
    ├── README.md
    ├── ARCHITECTURE.md
    └── TEMPLATE_GUIDE.md
```

---

## 🔧 Creating Custom Templates

### Template Structure

Templates use YAML frontmatter + Markdown content:

```markdown
---
id: my-custom-template
name: My Custom Template
version: 1.0.0
category: custom
type: custom
description: A custom template for specific use case
variables:
  - name: myVariable
    type: string
    description: Description of the variable
    required: true
    prompt: "What is the value?"
---
# Template Content

This is the template content using {{myVariable}}.

You can use Handlebars syntax:
- {{upper myVariable}}
- {{#if condition}}...{{/if}}
- {{#each items}}...{{/each}}
```

### Available Handlebars Helpers

* **Text transforms**: `{{upper}}`, `{{lower}}`, `{{capitalize}}`
* **Conditionals**: `{{eq}}`, `{{ne}}`
* **Arrays**: `{{join array ", "}}`
* **Defaults**: `{{default value "fallback"}}`
* **Code blocks**: `{{codeblock "js" code}}`
* **Utilities**: `{{indent}}`, `{{truncate}}`, `{{date}}`

### Template Validation

```bash
ig-prompt validate my-template.md
```

Validates against:
* JSON Schema
* Variable definitions
* Content structure
* Handlebars syntax

---

## 📊 Analytics & Metrics

Track prompt usage and effectiveness:

```bash
# View overall statistics
ig-prompt stats

# View usage metrics
ig-prompt metrics

# View metrics for specific period
ig-prompt metrics --period 7

# Export metrics as JSON
ig-prompt metrics --json > metrics.json
```

**Tracked Metrics:**
* Usage count per template
* Success rate
* Average duration
* Quality ratings
* Effectiveness scores
* Trending templates

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

---

## 🎨 Template Composition

### Inheritance

```yaml
---
id: my-specialized-template
extends: ui-ux-fix  # Inherit from base template
# Override or add fields
---
```

### Mixins

```yaml
---
id: my-template
mixins:
  - security-checklist
  - performance-checklist
---
```

Use markers to control placement:

```markdown
<!-- MIXIN:PREPEND --> - Insert mixin content here
<!-- MIXIN:APPEND --> - Append mixin content here
```

---

## 🔌 Integrations

### GitHub Issues/PRs

```bash
ig-prompt generate bug-fix --github | gh issue create -F -
```

### Jira

```bash
ig-prompt generate feature --jira
```

### Linear

```bash
ig-prompt generate ui-ux-fix --linear
```

---

## 📈 Best Practices

### 1. Choose the Right Template

* **UI/UX Fix**: Client-visible interface issues
* **Feature**: New functionality (comprehensive)
* **Bug Fix**: Defects and errors
* **Refactor**: Code quality improvements
* **Security Fix**: Vulnerabilities and security issues

### 2. Provide Complete Context

* Fill in all required variables
* Be specific and detailed
* Include reproduction steps
* Specify acceptance criteria

### 3. Review Before Using

* Preview the generated prompt
* Verify all variables are correct
* Adjust complexity level as needed

### 4. Track Outcomes

* Record success/failure
* Provide feedback ratings
* Help improve templates

---

## 🛠️ Advanced Usage

### Context Injection

Automatically inject codebase context:

```typescript
import { ContextInjector } from './cli/context.js';

const injector = new ContextInjector();
const context = await injector.getCodebaseContext();

// Includes:
// - Git status (branch, commit, author)
// - Project info (name, version, stack)
// - Environment (Node, pnpm, OS)
// - CI status
```

### Programmatic API

```typescript
import { TemplateRegistry, TemplateEngine } from '@intelgraph/prompt-system';

const registry = new TemplateRegistry();
await registry.loadAll();

const template = registry.get('ui-ux-fix');
const engine = new TemplateEngine();

const result = engine.render(template, {
  title: 'My Issue',
  // ... other variables
});

console.log(result.content);
```

---

## 📚 Documentation

* [Architecture](./docs/ARCHITECTURE.md) - System design and implementation
* [Template Guide](./docs/TEMPLATE_GUIDE.md) - Creating and customizing templates
* [API Documentation](./docs/API.md) - Programmatic API reference

---

## 🤝 Contributing

### Adding Templates

1. Create template file in `templates/<category>/`
2. Follow the template schema
3. Add tests
4. Update documentation

### Reporting Issues

Please include:
* Template ID
* Variable values used
* Expected vs actual output
* Environment details

---

## 📄 License

MIT © IntelGraph Team

---

## 🙏 Acknowledgments

Built with:
* [Handlebars](https://handlebarsjs.com/) - Template engine
* [Commander](https://github.com/tj/commander.js) - CLI framework
* [Enquirer](https://github.com/enquirer/enquirer) - Interactive prompts
* [AJV](https://ajv.js.org/) - JSON Schema validation

---

**Remember**: The golden path is sacred. Keep it green! 🟢
