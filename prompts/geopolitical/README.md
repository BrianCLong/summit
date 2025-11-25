# Geopolitical Analysis Prompts

This directory contains 21 comprehensive prompts for AI-augmented geopolitical intelligence analysis.

## Purpose

These prompts are designed to guide legitimate analytical work in:

- **Humanitarian early warning and crisis prevention**
- **Risk assessment for policy and business planning**
- **Scenario modeling and strategic foresight**
- **Academic research and analysis**
- **Diplomatic strategy development**

## Prompt Index

### Risk Indicators (1-12)

1. **Political Stability Analysis** - Government effectiveness, elite cohesion, institutional assessment
2. **Leadership Transition Risk** - Succession planning, continuity scenarios
3. **Food Security Risk** - Grain reserves, prices, agricultural production, unrest risks
4. **Supply Chain Vulnerability** - Resource dependencies, concentration, alternatives
5. **Water Security Assessment** - Transboundary dependencies, conflict/cooperation
6. **Alliance Stability Tracking** - Military and political cohesion monitoring
7. **Economic Stability Monitoring** - GDP, inflation, debt, currency risks
8. **Military Capability Assessment** - Force structure, modernization, civil-military relations
9. **Sanctions Impact Analysis** - Economic effects, evasion, humanitarian consequences
10. **Currency Sovereignty Tracking** - De-dollarization, payment systems, reserves
11. **Humanitarian Crisis Early Warning** - Displacement, protection, needs assessment
12. **Strategic Resource Dependency** - Critical minerals, energy, food, technology inputs

### Strategic Analysis (13-21)

13. **Arctic Territorial Dynamics** - Claims, resources, environmental change, cooperation
14. **Energy Security Analysis** - Import dependencies, resilience, transition dynamics
15. **Diaspora Influence Tracking** - Economic, political, social linkages
16. **Nuclear Capability Monitoring** - Non-proliferation, verification, diplomatic engagement
17. **Power Transition Tracking** - Global power shifts, hegemonic stability
18. **Scenario Modeling Framework** - What-if analysis methodology
19. **Climate Security Nexus** - Climate-conflict linkages, migration, adaptation
20. **Cyber Sovereignty Dynamics** - Internet governance, data localization, fragmentation
21. **Regional Integration Dynamics** - Trade blocs, political cooperation, geopolitical implications

## How to Use These Prompts

### For Analysts

1. **Select the relevant prompt** for your analysis question
2. **Follow the framework** provided in each prompt
3. **Use only legitimate data sources** (public data, international organizations, academic research)
4. **Apply ethical guidelines** specified in each prompt
5. **Document confidence levels** and uncertainties
6. **Provide actionable insights** aligned with humanitarian or policy goals

### For AI/Copilot Integration

```typescript
// Example: Using a prompt with Summit's Copilot
import { loadPrompt } from '@summit/copilot';

const prompt = await loadPrompt('prompts/geopolitical/03-food-security-risk.md');

const analysis = await copilot.analyze({
  prompt,
  context: {
    country: 'Ethiopia',
    timeframe: '6-month-outlook',
    indicators: ['grain_reserves', 'price_inflation', 'supply_chain'],
  },
  purpose: 'Humanitarian early warning for WFP planning',
});
```

### For Scenario Planning

Use Prompt #18 (Scenario Modeling Framework) as a meta-framework to structure analysis:

1. Define scope and critical uncertainties
2. Develop 2-4 distinct scenarios
3. Analyze implications using relevant indicator prompts (1-17, 19-21)
4. Develop adaptive strategies

## Prompt Structure

Each prompt follows a consistent structure:

1. **Objective** - Clear purpose and goals
2. **Analysis Framework** - Key dimensions and indicators
3. **Methodology** - How to conduct the analysis
4. **Risk Assessment** - Levels and thresholds
5. **Scenario Planning** - Alternative futures
6. **Ethical Guidelines** - Constraints and responsibilities
7. **Applications** - Legitimate use cases

## Ethical Framework

All prompts are designed with these ethical principles:

✅ **DO:**
- Support humanitarian protection and prevention
- Use publicly available data
- Maintain analytical objectivity
- Respect sovereignty and self-determination
- Clearly state confidence levels and uncertainties
- Focus on preparation and response, not manipulation

❌ **DO NOT:**
- Plan or support illegal activities
- Target individuals or violate privacy
- Manipulate or interfere with legitimate political processes
- Design deception operations
- Ignore humanitarian consequences
- Make decisions that should be made by humans

## Data Sources

Recommended legitimate data sources:

### International Organizations
- United Nations (UN, UNHCR, WFP, etc.)
- World Bank and IMF
- International Energy Agency (IEA)
- IAEA (nuclear)
- ICRC (humanitarian)

### Government & Official
- National statistics offices
- Central banks
- Official government reports
- Public diplomatic statements

### Academic & Research
- Universities and think tanks
- Peer-reviewed journals
- Policy research institutes
- NGO reports (Amnesty, HRW, etc.)

### Open Source Intelligence (OSINT)
- Reputable media sources
- Satellite imagery (commercial)
- Trade data
- Public company reports

## Integration with Summit Platform

These prompts integrate with:

- **`@summit/geopolitical-analysis`** package (calculators, types)
- **Copilot service** for AI-augmented analysis
- **GraphQL API** for querying and storing results
- **Neo4j** for relationship modeling
- **PostgreSQL** for time-series data

## Updating Prompts

When updating prompts:

1. Maintain ethical standards
2. Cite methodology sources
3. Update version history
4. Test with sample scenarios
5. Review by domain experts

## Version History

- **v1.0.0** (2025-01-25): Initial release of 21 prompts
  - Comprehensive coverage of geopolitical domains
  - Ethical safeguards integrated
  - Scenario modeling framework included

## Support

Questions or issues:
- Technical: team@summit.example.com
- Ethical concerns: ethics@summit.example.com
- Security: security@summit.example.com

---

**Use these prompts responsibly to support peace, stability, humanitarian protection, and legitimate analytical needs.**
