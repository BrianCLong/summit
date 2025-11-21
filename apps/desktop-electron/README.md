# IntelGraph Desktop

Cross-platform desktop application for IntelGraph intelligence analysis platform built with Electron.

## Features

- **Native Performance**: Desktop-class performance with native OS integration
- **Auto-Updates**: Automatic application updates without manual downloads
- **Multi-Window Support**: Open multiple windows for enhanced productivity
- **System Tray**: Quick access from system tray/menu bar
- **Keyboard Shortcuts**: Comprehensive keyboard shortcut support
- **File System Access**: Native file system integration for import/export
- **Offline Support**: Full offline capabilities with data synchronization
- **Hardware Acceleration**: GPU-accelerated rendering for smooth performance
- **Screen Sharing**: Built-in screen sharing capabilities (future)
- **Deep Linking**: Support for intelgraph:// protocol URLs

## Supported Platforms

- Windows 10/11 (x64, ARM64)
- macOS 10.15+ (Intel, Apple Silicon)
- Linux (x64, ARM64)
  - Ubuntu 18.04+
  - Debian 10+
  - Fedora 32+
  - Other distributions with AppImage support

## Development

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Install Dependencies

```bash
pnpm install
```

### Run in Development

```bash
pnpm electron:dev
```

This will start both the Vite dev server and Electron in development mode.

### Build for Production

```bash
# Build for current platform
pnpm build

# Build for specific platforms
pnpm build:win    # Windows
pnpm build:mac    # macOS
pnpm build:linux  # Linux
```

Build artifacts will be in `release/` directory.

## Distribution

### Windows

- **NSIS Installer**: Full installer with uninstaller
- **Portable**: Standalone executable

### macOS

- **DMG**: Disk image for installation
- **ZIP**: Compressed archive

### Linux

- **AppImage**: Universal Linux package
- **DEB**: Debian/Ubuntu package
- **RPM**: Fedora/RHEL package

## Auto-Updates

The application uses `electron-updater` for automatic updates:

- **Windows**: Updates via NSIS installer
- **macOS**: Updates via ZIP files
- **Linux**: Updates via AppImage

Updates are checked on startup and periodically in the background.

## Project Structure

```
apps/desktop-electron/
├── electron/           # Electron main process
│   ├── main.ts        # Main process entry point
│   └── preload.ts     # Preload script
├── src/               # Renderer process (React app)
├── build/             # Build resources (icons, etc.)
├── dist/              # Built web app
├── dist-electron/     # Built Electron code
└── release/           # Distribution packages
```

## Configuration

### Application Menu

Custom application menu with platform-specific items:
- File operations
- Edit operations
- View controls
- Window management
- Help resources

### System Tray

System tray icon with quick actions:
- Show/hide main window
- Quick access to common features
- Quit application

### Keyboard Shortcuts

- `Cmd/Ctrl+N`: New case
- `Cmd/Ctrl+W`: Close window
- `Cmd/Ctrl+Q`: Quit application
- `Cmd/Ctrl+,`: Settings
- `Cmd/Ctrl+R`: Reload
- `Cmd/Ctrl+Shift+R`: Force reload
- `F11`: Toggle fullscreen
- `F12`: Toggle developer tools

## Security

- **Context Isolation**: Enabled for security
- **Node Integration**: Disabled in renderer
- **Sandbox**: Enabled for renderer processes
- **Preload Script**: Controlled API exposure
- **CSP**: Content Security Policy enabled
- **Protocol Handling**: Secure deep link handling

## Storage

Data is stored using `electron-store`:
- **User Preferences**: Application settings
- **Window State**: Window size/position
- **Cache**: Application cache

Storage location:
- **Windows**: `%APPDATA%/intelgraph`
- **macOS**: `~/Library/Application Support/intelgraph`
- **Linux**: `~/.config/intelgraph`

## Logs

Application logs using `electron-log`:
- **Windows**: `%USERPROFILE%\AppData\Roaming\intelgraph\logs`
- **macOS**: `~/Library/Logs/intelgraph`
- **Linux**: `~/.config/intelgraph/logs`

## Deep Links

The application registers the `intelgraph://` protocol:

```
intelgraph://case/123
intelgraph://entity/abc-def
intelgraph://search?q=keyword
```

## Building Icons

Icon requirements:
- **Windows**: 256x256 PNG → ICO
- **macOS**: 1024x1024 PNG → ICNS
- **Linux**: 512x512 PNG

Use `electron-icon-builder` to generate all formats:

```bash
electron-icon-builder --input=icon.png --output=build
```

## Code Signing

### macOS

1. Get Developer ID certificate from Apple
2. Set environment variables:
   ```bash
   export CSC_LINK=/path/to/certificate.p12
   export CSC_KEY_PASSWORD=certificate_password
   ```

### Windows

1. Get code signing certificate
2. Set environment variables:
   ```bash
   set CSC_LINK=C:\path\to\certificate.pfx
   set CSC_KEY_PASSWORD=certificate_password
   ```

## Notarization (macOS)

1. Enable hardened runtime
2. Add entitlements
3. Notarize with Apple:
   ```bash
   export APPLE_ID=your@email.com
   export APPLE_ID_PASSWORD=app-specific-password
   export APPLE_TEAM_ID=team_id
   ```

## Publishing

Configure in `package.json`:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "intelgraph",
      "repo": "summit"
    }
  }
}
```

Then run:

```bash
pnpm electron:build --publish always
```

## Troubleshooting

### Build fails

```bash
# Clean and rebuild
rm -rf dist dist-electron node_modules
pnpm install
pnpm build
```

### Updates not working

- Check code signing
- Verify publish configuration
- Check update server accessibility

### Performance issues

- Enable hardware acceleration
- Check for memory leaks
- Profile with DevTools

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.
