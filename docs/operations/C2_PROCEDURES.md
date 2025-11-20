# Intelligence Operations C2 Procedures

## Standard Operating Procedures for Command and Control

### Table of Contents

1. [Mission Planning Procedures](#mission-planning-procedures)
2. [Collection Management](#collection-management)
3. [Operations Center Procedures](#operations-center-procedures)
4. [Intelligence Fusion Workflow](#intelligence-fusion-workflow)
5. [Targeting Procedures](#targeting-procedures)
6. [Decision Support Process](#decision-support-process)
7. [Crisis Response](#crisis-response)
8. [Security and Compliance](#security-and-compliance)

## Mission Planning Procedures

### SOP-001: Mission Plan Development

**Purpose**: Standardize the mission planning process for intelligence operations.

**Procedure**:

1. **Initiation** (Day 1-2)
   - Receive mission tasking or identify intelligence gap
   - Assemble planning team
   - Conduct initial intelligence review
   - Define mission scope and objectives

2. **Intelligence Requirements** (Day 2-3)
   - Develop Priority Intelligence Requirements (PIRs)
   - Identify Essential Elements of Information (EEIs)
   - Define collection requirements
   - Establish success criteria

3. **Resource Planning** (Day 3-5)
   - Identify required collection assets
   - Determine personnel requirements
   - Calculate budget and timeline
   - Request resource allocation

4. **Risk Assessment** (Day 4-5)
   - Identify operational risks
   - Assess security risks
   - Evaluate legal and policy compliance
   - Develop mitigation strategies
   - Create contingency plans

5. **Plan Documentation** (Day 5-6)
   - Complete mission plan template
   - Generate supporting documents
   - Prepare briefing materials
   - Submit for review

6. **Review and Approval** (Day 7-10)
   - Legal review
   - Security review
   - Command briefing
   - Obtain necessary approvals
   - Document approval chain

7. **Execution Preparation** (Day 10-14)
   - Finalize resource assignments
   - Conduct team briefings
   - Test communications
   - Establish monitoring procedures
   - Create execution timeline

**Roles**:
- **Mission Planner**: Overall plan development
- **Intelligence Officer**: Requirements and intelligence review
- **Legal Advisor**: Legal compliance review
- **Security Officer**: Security and classification review
- **Resource Manager**: Resource allocation and coordination
- **Commander**: Final approval authority

**Documentation**:
- Mission Plan (using MissionPlan schema)
- Intelligence Requirements (IntelligenceRequirement)
- Risk Assessment (RiskAssessment)
- Approval Records (in OperationWorkflow)

### SOP-002: Intelligence Requirements Management

**Purpose**: Track and manage intelligence requirements throughout the intelligence cycle.

**Procedure**:

1. **Requirement Creation**
   - Define requirement clearly and specifically
   - Assign priority level
   - Set realistic deadline
   - Identify dissemination restrictions
   - Link to parent operation

2. **Validation**
   - Verify requirement is not duplicative
   - Confirm requirement is achievable
   - Validate priority assignment
   - Obtain approving authority signature

3. **Tasking**
   - Determine best collection method
   - Assign to appropriate collection assets
   - Coordinate with collection manager
   - Establish reporting timeline

4. **Monitoring**
   - Track collection progress
   - Monitor for delays or issues
   - Adjust priorities as needed
   - Provide status updates

5. **Satisfaction Assessment**
   - Review collected intelligence
   - Determine if requirement is satisfied
   - Document satisfaction level
   - Identify any gaps

6. **Feedback**
   - Provide feedback to collectors
   - Document lessons learned
   - Update requirement if needed
   - Close requirement when satisfied

## Collection Management

### SOP-101: Asset Tasking and Coordination

**Purpose**: Efficiently task and coordinate collection assets.

**Procedure**:

1. **Asset Availability Check**
   ```typescript
   const available = coordinator.getAvailableAssets({
     type: requiredType,
     startTime: taskStart,
     endTime: taskEnd,
     capabilities: requiredCapabilities
   });
   ```

2. **Task Creation**
   - Complete collection task form
   - Specify target details
   - Define collection parameters
   - Set quality requirements
   - Establish dissemination list

3. **Scheduling**
   - Check for scheduling conflicts
   - Perform deconfliction
   - Coordinate with other users
   - Reserve asset time slot
   - Confirm schedule with asset operator

4. **Execution Monitoring**
   - Track asset position
   - Monitor collection progress
   - Address issues immediately
   - Record data collected
   - Track quality metrics

5. **Post-Collection**
   - Verify data receipt
   - Assess quality
   - Provide feedback
   - Update asset performance metrics
   - Close task

**Deconfliction Process**:
- Identify conflicts automatically using system
- Contact affected parties
- Negotiate resolution
- Document deconfliction in system
- Update schedules accordingly

### SOP-102: Collection Coverage Optimization

**Purpose**: Maximize collection coverage with available assets.

**Procedure**:

1. **Requirements Analysis**
   - Gather all active requirements
   - Group by geographic area
   - Identify priority requirements
   - Determine timing constraints

2. **Asset Inventory**
   - Review all available assets
   - Check asset capabilities
   - Verify operational status
   - Identify scheduling windows

3. **Optimization**
   ```typescript
   const optimization = coordinator.optimizeCoverage(allTasks);
   ```
   - Assign tasks to optimal assets
   - Minimize gaps in coverage
   - Balance asset utilization
   - Consider priority weighting

4. **Review and Adjust**
   - Review optimization results
   - Manually adjust as needed
   - Address unassigned tasks
   - Seek additional resources if necessary

5. **Implementation**
   - Schedule all assignments
   - Notify asset operators
   - Confirm all schedules
   - Monitor execution

## Operations Center Procedures

### SOP-201: Common Operating Picture (COP) Management

**Purpose**: Maintain accurate and current common operating picture.

**Procedure**:

1. **COP Initialization**
   - Create COP for operation
   - Define required layers
   - Set viewport and filters
   - Configure access controls

2. **Entity Management**
   - Add entities to appropriate layers
   - Update entity positions regularly
   - Maintain entity metadata
   - Remove stale entities

3. **Update Cycle**
   - Real-time updates for dynamic entities
   - Periodic updates for static entities
   - Verify data freshness
   - Flag outdated information

4. **Quality Control**
   - Verify entity accuracy
   - Check classification markings
   - Validate confidence scores
   - Review source attribution

5. **Display Management**
   - Optimize layer visibility
   - Adjust symbology as needed
   - Manage clutter
   - Ensure readability

### SOP-202: Event Processing and Alert Management

**Purpose**: Process operational events and manage alerts effectively.

**Procedure**:

1. **Event Receipt**
   - Receive event from source
   - Validate event data
   - Assign event ID
   - Record in system

2. **Event Assessment**
   - Determine event type
   - Assess severity
   - Assign priority
   - Identify involved entities
   - Check for correlations

3. **Alert Generation**
   - Evaluate against alert rules
   - Generate alerts for matches
   - Notify appropriate personnel
   - Log alert in system

4. **Event Correlation**
   - Search for related events
   - Identify patterns
   - Link related events
   - Update intelligence picture

5. **Event Response**
   - Acknowledge event
   - Assign to analyst if needed
   - Take appropriate action
   - Document response
   - Update event status

6. **Event Archival**
   - Move resolved events to archive
   - Maintain search capability
   - Preserve for analysis
   - Follow retention policy

### SOP-203: Watch Operations

**Purpose**: Standardize watch operations and shift handover.

**Procedure**:

1. **Shift Start**
   - Review handover brief from previous shift
   - Check COP for current situation
   - Review active alerts
   - Check pending actions
   - Test all systems

2. **Watch Standing**
   - Monitor COP continuously
   - Process incoming events
   - Update entity positions
   - Track ongoing operations
   - Respond to alerts
   - Maintain watch log

3. **Watch Log Maintenance**
   ```typescript
   const logEntry = {
     id: generateId(),
     shiftId: currentShift.id,
     timestamp: new Date().toISOString(),
     type: 'OBSERVATION',
     entry: 'Significant event description',
     classification: 'SECRET',
     author: watchOfficer,
     relatedEvents: ['event-001']
   };
   ```

4. **Shift Handover**
   - Prepare handover brief
   - Summarize key events
   - List pending actions
   - Highlight issues
   - Conduct verbal brief
   - Transfer watch

5. **Shift Close**
   - Complete watch log
   - File required reports
   - Secure materials
   - Brief relief

## Intelligence Fusion Workflow

### SOP-301: Multi-INT Report Processing

**Purpose**: Process and fuse intelligence from multiple disciplines.

**Procedure**:

1. **Report Ingestion**
   ```typescript
   const report = fusion.ingestReport({
     discipline: 'SIGINT',
     source: sourceData,
     // ... complete report data
   });
   ```

2. **Source Evaluation**
   - Assess source reliability
   - Rate information credibility
   - Apply NATO rating scale
   - Document assessment

3. **Entity Extraction**
   - Identify mentioned entities
   - Extract entity attributes
   - Link to existing entities
   - Update entity resolution

4. **Correlation Analysis**
   - Find related reports
   - Identify confirmations
   - Flag contradictions
   - Calculate correlation scores

5. **Fusion Product Creation**
   - Select reports for fusion
   - Generate fused assessment
   - Document confidence level
   - Identify intelligence gaps
   - List alternative hypotheses

6. **Dissemination**
   - Apply classification markings
   - Check dissemination controls
   - Distribute to authorized users
   - Track dissemination

### SOP-302: Entity Resolution

**Purpose**: Maintain accurate entity resolution across reports.

**Procedure**:

1. **Entity Mention Processing**
   - Extract entity from report
   - Capture all attributes
   - Note context
   - Record confidence

2. **Resolution Matching**
   - Search for similar entities
   - Compare attributes
   - Check aliases
   - Calculate similarity score

3. **Resolution Decision**
   - High confidence (>90%): Auto-merge
   - Medium confidence (70-90%): Analyst review
   - Low confidence (<70%): Create new entity

4. **Entity Update**
   - Add mention to entity
   - Update attributes
   - Merge aliases
   - Recalculate confidence
   - Update relationships

5. **Quality Assurance**
   - Periodic review of entities
   - Validate resolutions
   - Split incorrectly merged entities
   - Merge missed duplicates

## Targeting Procedures

### SOP-401: Target Development Process

**Purpose**: Develop and validate targets for action.

**Procedure**:

1. **Target Nomination**
   - Identify potential target
   - Gather initial intelligence
   - Create target record
   - Set status to NOMINATED

2. **Intelligence Development**
   - Collect supporting intelligence
   - Analyze imagery
   - Assess pattern of life
   - Document target characteristics
   - Identify vulnerabilities

3. **Collateral Assessment**
   - Measure civilian proximity
   - Estimate civilian presence
   - Identify cultural sites
   - Assess environmental concerns
   - Determine restriction level

4. **Target Validation**
   - Verify target identification
   - Confirm target function
   - Validate intelligence
   - Check against ROE
   - Update status to VALIDATED

5. **Target Package Development**
   - Compile all intelligence
   - Add imagery products
   - Develop weaponeering
   - Create timing recommendation
   - Complete coordination requirements

6. **Legal Review**
   - Submit for legal review
   - Address any concerns
   - Document legal determination
   - Obtain legal approval

7. **Approval Chain**
   - Brief to appropriate authority
   - Obtain required approvals
   - Document approval conditions
   - Set status to APPROVED

### SOP-402: Strike Coordination

**Purpose**: Coordinate strike execution safely and effectively.

**Procedure**:

1. **Strike Request**
   - Submit strike request
   - Specify platform and weapon
   - Propose time on target
   - Provide target package

2. **Coordination**
   - Airspace deconfliction
   - Blue force deconfliction
   - Weather check
   - Communications check
   - Final target verification

3. **Approval**
   - Route through approval chain
   - Obtain final authorization
   - Confirm execution authority
   - Set go/no-go criteria

4. **Execution**
   - Monitor platform
   - Confirm target ID
   - Authorize weapon release
   - Observe impact if possible

5. **Initial Assessment**
   - Record actual TOT
   - Document weapons released
   - Note initial observations
   - Report any issues

6. **Battle Damage Assessment**
   - Collect post-strike imagery
   - Analyze damage
   - Assess functional impact
   - Determine re-attack requirement
   - Complete BDA report

## Decision Support Process

### SOP-501: Course of Action Development

**Purpose**: Develop and analyze courses of action for decision makers.

**Procedure**:

1. **Option Development**
   - Identify possible COAs
   - Define each option clearly
   - Specify resource requirements
   - Estimate timelines
   - List advantages/disadvantages

2. **COA Analysis**
   - Assess feasibility
   - Calculate success probability
   - Identify risks
   - Evaluate resource needs

3. **Comparison**
   - Define comparison criteria
   - Weight criteria appropriately
   - Score each COA
   - Calculate weighted scores
   - Rank options

4. **Recommendation**
   - Select recommended option
   - Document rationale
   - Identify conditions
   - List alternatives

5. **Briefing Preparation**
   - Create executive brief
   - Prepare supporting materials
   - Anticipate questions
   - Coordinate with stakeholders

### SOP-502: Risk Assessment

**Purpose**: Comprehensively assess operational risks.

**Procedure**:

1. **Risk Identification**
   - Brainstorm potential risks
   - Review historical data
   - Consult subject matter experts
   - Categorize risks

2. **Risk Analysis**
   - Assess likelihood
   - Evaluate impact
   - Calculate risk level
   - Prioritize risks

3. **Mitigation Planning**
   - Develop mitigation strategies
   - Estimate mitigation costs
   - Calculate residual risk
   - Assign risk owners

4. **Monitoring Planning**
   - Define risk indicators
   - Set trigger conditions
   - Establish monitoring procedures
   - Create response plans

5. **Documentation**
   - Complete risk assessment
   - Brief to leadership
   - Obtain acceptance
   - Review periodically

## Crisis Response

### SOP-601: Crisis Response Activation

**Purpose**: Rapidly respond to crisis situations.

**Procedure**:

1. **Crisis Detection**
   - Identify crisis trigger
   - Assess severity
   - Determine crisis level
   - Alert leadership

2. **Response Team Activation**
   - Notify response team members
   - Assemble team
   - Establish command post
   - Initialize crisis response record

3. **Situation Assessment**
   - Gather current information
   - Update COP
   - Brief team
   - Develop timeline

4. **Response Planning**
   - Identify immediate actions
   - Assign responsibilities
   - Set priorities
   - Establish communications

5. **Execution**
   - Implement response actions
   - Monitor progress
   - Adjust as needed
   - Maintain decision log

6. **Communications**
   - Internal notifications
   - External coordination
   - Status reporting
   - Media management

7. **Resolution**
   - Implement resolution
   - Stand down team
   - Conduct after-action review
   - Document lessons learned

## Security and Compliance

### SOP-701: Classification Management

**Purpose**: Properly manage classified information.

**Requirements**:
- Set appropriate classification levels
- Apply all required caveats
- Honor dissemination restrictions
- Follow handling procedures
- Maintain audit trails

**Classification Levels**:
- UNCLASSIFIED: No classification required
- CONFIDENTIAL: Low-level classified
- SECRET: Standard classified operations
- TOP SECRET: Highly sensitive operations
- TOP SECRET/SCI: Compartmented information

**Dissemination Controls**:
- NOFORN: No foreign nationals
- ORCON: Originator controlled
- RELIDO: Releasable to [specific countries]
- RESTRICTED: Limited distribution

### SOP-702: Audit and Compliance

**Purpose**: Maintain compliance with legal and policy requirements.

**Procedures**:
- Document all decisions
- Maintain approval chains
- Record all accesses
- Track dissemination
- Preserve audit trails
- Conduct periodic reviews
- Report violations immediately

### SOP-703: OPSEC Compliance

**Purpose**: Protect sensitive operational information.

**Procedures**:
- Identify critical information
- Recognize indicators
- Assess threats
- Analyze vulnerabilities
- Apply countermeasures
- Monitor for compromises
- Update OPSEC plan regularly

## Appendices

### Appendix A: Quick Reference

**Emergency Contacts**:
- Operations Center: [Contact Info]
- Legal: [Contact Info]
- Security: [Contact Info]
- IT Support: [Contact Info]

**System URLs**:
- Operations C2 Service: [URL]
- Mission Coordination: [URL]
- Documentation: [URL]

### Appendix B: Forms and Templates

See system documentation for:
- Mission Plan Template
- Intelligence Requirement Form
- Target Package Format
- Strike Request Form
- BDA Report Template
- Risk Assessment Template
- Executive Brief Template

### Appendix C: Approval Authorities

Refer to organizational directive for:
- Mission approval authorities
- Target approval authorities
- Strike approval authorities
- Classification authorities
- Dissemination authorities

### Appendix D: Glossary

- **AAR**: After Action Review
- **BDA**: Battle Damage Assessment
- **COA**: Course of Action
- **COP**: Common Operating Picture
- **EEI**: Essential Element of Information
- **HVT**: High Value Target
- **INT**: Intelligence
- **OPSEC**: Operational Security
- **PIR**: Priority Intelligence Requirement
- **ROE**: Rules of Engagement
- **TOT**: Time on Target

---

**Document Control**
- Version: 1.0
- Last Updated: 2025-01-20
- Classification: UNCLASSIFIED
- Distribution: Authorized Users
