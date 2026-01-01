# IntelGraph GA Core Dashboard

This directory contains the modernized Go/No-Go dashboard for the IntelGraph General Availability release, replacing the legacy static HTML implementation with a dynamic React application.

## Overview

The GA Core Dashboard provides a comprehensive view of release readiness metrics for IntelGraph platform, including:

- Performance metrics and trends
- Quality indicators and targets
- Policy enforcement statistics
- System health overview
- Go/No-Go decision support

## Features

- **Interactive Charts**: Real-time visualizations using Recharts
- **Responsive Design**: Works across all device sizes
- **Live Metrics**: Dynamic data display with auto-refresh capability
- **Status Indicators**: Color-coded go/warning/no-go status
- **Professional UI**: Clean, enterprise-grade interface design
- **Accessibility**: Built with accessibility best practices

## Architecture

- **Framework**: React 18 with Vite build tool
- **Charts**: Recharts for interactive data visualization
- **Styling**: CSS Modules for component-scoped styles
- **Responsive**: Mobile-first design approach

## Components

The application is organized into several main components:

1. **Status Cards**: Individual metric cards with progress bars
2. **Metrics Charts**: Interactive visualizations of key metrics
3. **Acceptance Criteria**: Go/no-go requirement tracking
4. **Decision Panel**: Overall release readiness indicator

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd dashboard
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

## Security

This implementation addresses security concerns of the legacy version by:

- Eliminating CDN dependencies for charting libraries
- Using locally bundled dependencies
- Implementing proper security headers (to be configured with deployment)

## Contributing

1. Create a feature branch from `main`
2. Make changes following the existing code patterns
3. Test functionality across different screen sizes
4. Ensure all charts are accessible and responsive
5. Submit a pull request with detailed description
