# VS Code Configuration for Summit/IntelGraph

This directory contains recommended VS Code settings and configurations for development.

## Files

### `settings.json`
Project-wide VS Code settings that will be applied when you open this workspace.

**Key configurations:**
- Auto-format on save with Prettier
- ESLint auto-fix on save
- TypeScript strict mode
- Optimized search/file watching
- Language-specific formatters

### `extensions.json`
Recommended VS Code extensions for this project.

**Essential extensions:**
- ESLint - JavaScript/TypeScript linting
- Prettier - Code formatting
- GraphQL - GraphQL syntax and tooling
- Jest - Test runner integration
- Docker - Container management

**Installation:**
VS Code will prompt you to install recommended extensions when you open the project.

Or install manually:
```bash
# Install all recommended extensions
code --list-extensions | xargs -L 1 code --install-extension
```

### `launch.json`
Debug configurations for various scenarios.

**Available configurations:**
- **Debug Server** - Debug the API server
- **Debug Client** - Debug the React frontend in Chrome
- **Debug Jest Tests** - Debug unit tests
- **Debug Playwright** - Debug E2E tests
- **Debug Full Stack** - Debug both server and client

**Usage:**
1. Set breakpoints in your code
2. Press `F5` or go to Run > Start Debugging
3. Select the configuration you want

### `tasks.json`
Quick tasks you can run from VS Code.

**Usage:**
- Press `Cmd/Ctrl + Shift + B` for build tasks
- Press `Cmd/Ctrl + Shift + P`, type "Tasks: Run Task"

**Available tasks:**
- Bootstrap Environment
- Start/Stop All Services
- Run Tests
- Build Packages
- Run CI Checks
- Database Migrations
- And more...

## Customization

### Personal Settings

To override these settings locally without committing changes:

1. Open User Settings: `Cmd/Ctrl + ,`
2. Modify settings there (takes precedence over workspace settings)

### Workspace-Specific Settings

To add settings that should apply to all team members:

1. Edit `.vscode/settings.json`
2. Commit and push the changes

### Local-Only Settings

To add settings only for your local environment:

1. Create `.vscode/settings.local.json` (gitignored)
2. Add your personal settings there

## Keyboard Shortcuts

### Essential Shortcuts

```
Cmd/Ctrl + P          - Quick file open
Cmd/Ctrl + Shift + P  - Command palette
Cmd/Ctrl + `          - Toggle terminal
Cmd/Ctrl + B          - Toggle sidebar
Cmd/Ctrl + Shift + F  - Search in files
F5                    - Start debugging
Shift + F5            - Stop debugging
F12                   - Go to definition
Cmd/Ctrl + .          - Quick fix
```

### Testing Shortcuts

```
Cmd/Ctrl + Shift + T  - Run tests
```

### Git Shortcuts (with GitLens)

```
Cmd/Ctrl + Shift + G  - Source Control view
```

## Troubleshooting

### Extensions Not Working

1. Reload VS Code: `Cmd/Ctrl + Shift + P` > "Reload Window"
2. Check extension is installed and enabled
3. Check extension logs in Output panel

### Format on Save Not Working

1. Check Prettier extension is installed
2. Verify `.prettierrc` exists in project root
3. Check file is not in `.prettierignore`
4. Ensure `editor.formatOnSave: true` in settings

### TypeScript Errors

1. Ensure you're using workspace TypeScript version
2. VS Code may prompt: "Select TypeScript Version" → Choose "Use Workspace Version"
3. Or: `Cmd/Ctrl + Shift + P` > "TypeScript: Select TypeScript Version" > "Use Workspace Version"

### ESLint Not Working

1. Check ESLint extension is installed
2. Verify `eslint.config.js` or `.eslintrc.cjs` exists
3. Run: `pnpm install` to ensure ESLint dependencies are installed
4. Check ESLint output panel for errors

## Additional Resources

- [VS Code Documentation](https://code.visualstudio.com/docs)
- [VS Code Tips and Tricks](https://code.visualstudio.com/docs/getstarted/tips-and-tricks)
- [Project Documentation](../docs/)

## Support

If you encounter issues with VS Code configuration:

1. Check [TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md)
2. Ask in #engineering channel
3. Create an issue with "vscode" label
