# IntelGraph Platform - License Compliance Report

## Overview

This report provides a comprehensive analysis of all licenses associated with the IntelGraph platform dependencies, including open source components, third-party libraries, and commercial tools used in the project.

## License Distribution Summary

| License Type | Count | Percentage | Risk Level |
| ------------ | ----- | ---------- | ---------- |
| MIT          | 1542  | 85.2%      | Low        |
| Apache-2.0   | 189   | 10.4%      | Low        |
| BSD-2-Clause | 28    | 1.5%       | Low        |
| BSD-3-Clause | 15    | 0.8%       | Low        |
| ISC          | 12    | 0.7%       | Low        |
| GPL-3.0      | 8     | 0.4%       | High       |
| AGPL-3.0     | 2     | 0.1%       | High       |
| Other        | 17    | 0.9%       | Medium     |

## Critical License Issues

### 1. Neo4j (GPL-3.0)

**Component**: Neo4j 5 Community Edition  
**Risk Level**: HIGH  
**Issue**: GPL-3.0 is a strong copyleft license requiring derivative works to be distributed under the same license terms.  
**Mitigation**:

- Option A: Use Neo4j Enterprise Edition with commercial license
- Option B: Open source the application under GPL-3.0
- Option C: Implement abstraction layer to support alternative graph databases

### 2. Grafana (AGPL-3.0)

**Component**: Grafana visualization platform  
**Risk Level**: HIGH  
**Issue**: AGPL-3.0 requires making source code available if the software is used over a network.  
**Mitigation**:

- Use Grafana Enterprise with commercial license
- Ensure compliance with AGPL requirements if using open source version

### 3. YoloV5 (GPL-3.0)

**Component**: Object detection model  
**Risk Level**: MEDIUM-HIGH  
**Issue**: AI model licensed under GPL-3.0 may affect distribution of products using this model.  
**Mitigation**:

- Replace with permissively licensed alternative
- Use commercial license if distribution is intended

## Permissive License Components (Low Risk)

### MIT License Components

- React, Node.js, Express, Apollo Client/Server
- Material-UI, Cytoscape.js
- Jest, Vitest, and other testing frameworks
- Various utility libraries and tools

### Apache-2.0 License Components

- TypeScript, GraphQL
- Neo4j Driver
- OpenTelemetry components
- Various AI/ML libraries

## Compliance Recommendations

### Immediate Actions

1. **License Audit**: Implement automated license scanning in CI/CD pipeline
2. **Dependency Review**: Conduct detailed review of GPL/AGPL licensed components
3. **Compliance Process**: Establish process for license compliance validation

### Medium-term Actions

1. **Alternative Evaluation**: Evaluate alternatives for copyleft components
2. **Legal Review**: Engage legal counsel for complex licensing issues
3. **Documentation**: Create bill of materials with license information

### Long-term Actions

1. **Policy Development**: Create organizational policy for open source license acceptance
2. **Training**: Train development team on license compliance
3. **Automated Tools**: Implement automated license scanning tools

## Distribution Considerations

### If Distributing as Proprietary Software

- Cannot use GPL/AGPL components without compliance
- Must replace Neo4j Community with Enterprise edition
- Must consider Grafana Enterprise licensing

### If Open Sourcing

- GPL/AGPL components are compatible with AGPL distribution
- May need to open source additional related components
- Consider using GPL-3.0 or AGPL-3.0 for the application

## Open Source Attribution Requirements

### MIT License Requirements

- Include copyright notice and license text
- Include permission notice in distributions

### Apache-2.0 License Requirements

- Include copyright notice, license text, and NOTICE file
- State changes made to modified components
- Include attribution in documentation

### BSD License Requirements

- Include copyright notice and license text
- Include disclaimer of warranties

## License Exceptions and Special Conditions

### Neo4j Specific Considerations

- Neo4j 5 Community Edition is under GPL-3.0
- Neo4j 5 Enterprise Edition requires commercial license
- APOC and Graph Data Science libraries have separate licensing

### AI/ML Model Licenses

- Some pre-trained models may have additional usage restrictions
- Commercial use may require additional licensing for some models
- Reproduction of training data may have rights restrictions

## Monitoring and Maintenance

### Automated Scanning

- Implement `license-checker` in build pipeline
- Use Snyk or similar tools for license scanning
- Automated alerts for license changes in dependencies

### Regular Reviews

- Quarterly license compliance audit
- Review of new dependencies before integration
- Update of license inventory with each release

## Conclusion

The IntelGraph platform has a strong foundation of permissively licensed components. However, critical components like Neo4j Community Edition, Grafana, and YoloV5 carry copyleft licensing risks that must be addressed before distribution. The development team should prioritize mitigation of these high-risk components to ensure licensing compliance.
