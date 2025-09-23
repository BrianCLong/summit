# IntelGraph Client Examples

This directory contains various App and main entry point examples that demonstrate different configurations and setups of the IntelGraph client application.

## Canonical Implementation

The production client uses:
- `src/App.jsx` - Full-featured application with routing, authentication, and all components
- `src/main.jsx` - Production entry point

## Example Variants

### App Components
- `App.apollo.jsx` - Apollo GraphQL-focused setup
- `App.basic.jsx` - Basic application setup
- `App.minimal.jsx` - Minimal React-only test setup
- `App.progressive.jsx` - Progressive feature loading
- `App.router.jsx` - Router-heavy configuration
- `App.simple.jsx` - Simplified feature set
- `App.test-simple.jsx` - Simple test configuration
- `App.test.jsx` - Basic test setup
- `App.working.jsx` - Working development version

### Main Entry Points
- `main.apollo.jsx` - Apollo-focused entry
- `main.basic.jsx` - Basic entry with error handling
- `main.debug.jsx` - Debug-heavy entry point
- `main.minimal.jsx` - Minimal entry for testing
- `main.progressive.jsx` - Progressive loading entry
- `main.router.jsx` - Router-focused entry
- `main.simple.jsx` - Simple entry point
- `main.test.jsx` - Test entry point
- `main.vanilla.jsx` - Vanilla JS approach
- `main.working.jsx` - Development working version

## Usage

To test any of these variants:

1. Copy the desired App/main files to `src/`
2. Update `index.html` if needed to point to the correct main file
3. Restart the development server

## Development Notes

These examples were created during development to test different approaches and configurations. They serve as:
- Reference implementations
- Testing configurations
- Progressive development stages
- Feature isolation examples

Do not modify the canonical `src/App.jsx` and `src/main.jsx` without good reason, as they are used in production.