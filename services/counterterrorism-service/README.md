# Counterterrorism Service

Comprehensive counterterrorism operations and intelligence service integrating all counterterrorism capabilities.

## Features

- **Integrated Intelligence**: Combines all counterterrorism intelligence packages
- **Operation Management**: Plan and execute counterterrorism operations
- **Interdiction Identification**: Identify opportunities to disrupt threats
- **Disruption Planning**: Target terrorist networks and operations
- **Evidence Management**: Collect and manage prosecution evidence
- **Information Sharing**: Coordinate with partner agencies
- **Legal Compliance**: Ensure operations comply with laws and human rights
- **Effectiveness Assessment**: Measure operation outcomes and impact
- **Threat Picture**: Comprehensive view of current threats

## Architecture

Integrates:
- Terrorist Tracking Package
- Extremism Monitor Package
- Radicalization Detection Package
- Foreign Fighters Package
- Terrorist Finance Package
- Propaganda Analysis Package

## API Endpoints

```
GET /health - Health check
GET /api/threat-picture - Get comprehensive threat assessment
GET /api/interdiction-opportunities - Identify intervention opportunities
GET /api/disruption-targets - Identify disruption targets
GET /api/services/:service - Access component services
```

## Usage

```bash
npm run dev    # Development mode
npm run build  # Build service
npm start      # Production mode
```

## Security

This service is designed for authorized law enforcement and intelligence use only, with built-in legal compliance and human rights safeguards.

## License

MIT
