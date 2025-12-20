# Cursor / Warp / VSCode Superprompt — Zero-Friction Devloop

You are operating inside a live editor/terminal environment.

All output MUST:

- Run immediately
- Require zero manual editing
- Provide the exact shell commands to run
- Be merge-ready
- Be CI-ready

---

## Required Output Sections

1. Code
2. Tests
3. Config updates
4. Documentation
5. Terminal commands
6. PR creation steps
7. CI verification steps

---

## Command Execution Pattern

Always provide copy-paste ready commands:

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test

# Run linting
pnpm lint

# Type check
pnpm typecheck

# Commit changes
git add -A
git commit -m "feat: implementation description"

# Push to remote
git push -u origin feature-branch

# Create PR (if gh CLI available)
gh pr create --fill

# Watch CI status
gh run watch
```

---

## Editor Integration

When in Cursor/VSCode:

1. **Multi-file edits** - Provide complete file contents for each file
2. **Inline completions** - Context-aware suggestions
3. **Terminal commands** - Exact commands to execute
4. **Diagnostics** - Address all editor warnings/errors

---

## Devloop Optimization

For rapid iteration:

1. **Hot reload aware** - Changes should work with HMR
2. **Type-safe** - No `any` types that break completions
3. **Import paths** - Use workspace aliases correctly
4. **Testing** - Include commands to run affected tests

---

## IntelGraph Quick Commands

```bash
# Start development stack
make up

# Run smoke tests
make smoke

# View logs
make logs

# Stop all services
make down

# Full rebuild
make bootstrap
```

---

## BEGIN NOW.
