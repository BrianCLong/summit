# Symphony - AI Orchestration Platform UI

This directory contains the modern, secure React-based UI for the Symphony orchestration platform, replacing the legacy CDN-dependent implementation.

## Overview

The Symphony UI is a React application built with Vite that provides centralized management for AI orchestration, including:

- LLM routing and decision making
- RAG (Retrieval Augmented Generation) tools
- Budget and burndown tracking
- Policy management and LOA (Level of Authorization)
- System observability and monitoring
- CI/Chaos engineering tools

## Architecture

- **Framework**: React 18 with modern hooks and context
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with a consistent design system
- **API Layer**: Centralized API service for backend communication
- **State Management**: React Context API for global state

## Features

- **Security First**: All dependencies bundled locally, no external CDN references
- **Real-time Monitoring**: Live system health and status updates
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Accessibility**: Semantic HTML, ARIA attributes, keyboard navigation
- **Modular Components**: Reusable, well-documented components

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd ui
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Components

The application is organized into several main sections:

1. **Dashboard**: Overview of system health and metrics
2. **Routing Studio**: AI model selection and routing configuration
3. **RAG Console**: Retrieval-augmented generation tools
4. **Neo4j Guard**: Database security and migration management
5. **Budgets & Burndown**: Cost tracking and usage monitoring
6. **Policies & LOA**: Governance and authorization controls
7. **Observability**: System monitoring and log analysis
8. **CI & Chaos**: Testing and chaos engineering tools
9. **Docs & Runbooks**: Documentation and procedural guides

## API Integration

The application communicates with backend services through the centralized API service (`src/api.js`) which handles:

- Health checks and system status
- Model routing and execution
- RAG operations
- Policy management
- Log retrieval and command execution

## Security

This implementation addresses critical security concerns of the legacy version by:

- Eliminating external CDN dependencies
- Bundling all JavaScript libraries locally
- Implementing proper CORS and security headers
- Providing a secure foundation for enterprise deployment

## Contributing

1. Create a feature branch from `main`
2. Make changes following the existing code patterns
3. Test functionality across different screen sizes
4. Ensure all components are accessible
5. Submit a pull request with detailed description
