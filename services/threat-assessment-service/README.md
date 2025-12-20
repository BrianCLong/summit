# Threat Assessment Service

Comprehensive threat assessment and risk analysis service for evaluating terrorism threats and vulnerabilities.

## Features

- **Threat Assessment**: Comprehensive threat evaluation framework
- **Attack Probability**: Calculate likelihood of attacks
- **Vulnerability Analysis**: Assess target vulnerabilities
- **Capability Assessment**: Evaluate adversary capabilities
- **Intent Analysis**: Assess adversary intentions
- **Geographic Threat Mapping**: Visualize threats by region
- **Sector Analysis**: Assess threats to specific sectors
- **Critical Infrastructure**: Protect key infrastructure
- **Mass Casualty Assessment**: Evaluate potential casualties
- **Symbolic Target Analysis**: Identify high-value targets
- **Risk Matrix**: Prioritize threats and scenarios
- **Threat Timeline**: Track threat evolution over time

## Assessment Framework

The service uses a multi-factor assessment model:

1. **Capability**: Adversary's ability to conduct attacks
2. **Intent**: Demonstrated desire to attack
3. **Opportunity**: Conditions favorable for attacks
4. **Vulnerability**: Target weaknesses and exposures

## API Endpoints

```
GET /health - Health check
GET /api/attack-probability/:targetId - Calculate attack probability
GET /api/geographic-threats - Generate geographic threat map
GET /api/sector-threats - Assess sector-specific threats
GET /api/risk-matrix - Generate comprehensive risk matrix
GET /api/assessment/:targetId - Get threat assessment
```

## Usage

```bash
npm run dev    # Development mode
npm run build  # Build service
npm start      # Production mode
```

## License

MIT
