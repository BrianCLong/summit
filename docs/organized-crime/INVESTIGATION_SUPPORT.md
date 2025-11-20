# Investigation Support Guide

## Case Management

### Opening an Investigation

**Prerequisites**:
- Legal authority (predication for investigation)
- Supervisory approval
- Case number assignment
- Proper classification

**Required Documentation**:
```json
{
  "caseNumber": "FBI-2025-OC-12345",
  "caseName": "Operation [REDACTED]",
  "investigationType": "ORGANIZED_CRIME",
  "legalAuthorities": [{
    "authorityType": "GRAND_JURY",
    "documentNumber": "GJ-2025-1234",
    "issuedBy": "US District Court, Southern District of NY",
    "issuedDate": "2025-01-15",
    "scope": "Investigation of RICO violations..."
  }],
  "leadAgency": "FBI",
  "caseAgents": [...]
}
```

**Steps**:
1. Document predication (reason to investigate)
2. Obtain supervisory approval
3. Secure legal authority as needed
4. Create case file in system
5. Assign investigative team
6. Establish security protocols

### Evidence Management

**Chain of Custody**:

Every piece of evidence requires:
- Collection date, time, location
- Collecting officer/agent
- Detailed description
- Storage location
- Transfer documentation

**Digital Evidence**:
- Forensic imaging required
- Hash values (MD5, SHA-256)
- Write-blockers for collection
- Proper forensic tools
- Expert examination

**Physical Evidence**:
- Proper packaging and sealing
- Evidence tags and labels
- Climate-controlled storage
- Limited access

**Documentary Evidence**:
- Original + copies
- Authenticity verification
- Proper Bates numbering
- Discovery compliance

### Surveillance Operations

**Legal Requirements**:

1. **Title III Wiretap**
   - Probable cause
   - Federal judge approval
   - 30-day initial period
   - Minimization required
   - Regular progress reports
   - Sealing of intercepts

2. **Pen Register/Trap & Trace**
   - Court order required
   - Call data only (not content)
   - 60-day authorization
   - Renewal available

3. **GPS Tracking**
   - Warrant required (US v. Jones)
   - Reasonable time limitation
   - Probable cause

4. **Video Surveillance**
   - Warrant for private areas
   - No expectation of privacy in public
   - Minimize collection of non-targets

**Operational Procedures**:

```typescript
const surveillanceOp = {
  operationType: "WIRETAP",
  legalAuthority: {
    authorityType: "TITLE_III",
    documentNumber: "W-2025-456",
    issuedBy: "Judge [Name]",
    issuedDate: new Date("2025-02-01"),
    expirationDate: new Date("2025-03-03"),
    scope: "Phone number [REDACTED]",
    reportingRequirements: [
      "7-day progress reports",
      "30-day renewal application",
      "Immediate sealing of intercepts"
    ]
  },
  methods: ["WIRETAP"],
  targets: [{
    entityId: "entity-123",
    targetType: "PHONE",
    justification: "Subject is using phone to coordinate drug trafficking..."
  }]
};
```

### Informant/Source Management

**CRITICAL SAFETY PROTOCOLS**:

1. **Identity Protection**
   - Anonymous source IDs only
   - Code numbers
   - True identity in separate secure system
   - No cross-referencing in case files

2. **Handler Protocols**
   - Primary and backup handlers
   - Regular meetings documented
   - Instruction and guidance
   - Payment authorization

3. **Risk Management**
   - Assess source reliability
   - Monitor for compromise
   - Safety measures
   - Emergency protocols

4. **Intelligence Validation**
   - Corroborate information
   - Track reliability history
   - Document in reports
   - Protect source methods

**Access Restrictions**:
- Requires highest level authorization
- Supervisor approval for each access
- Extra audit logging
- Need-to-know strictly enforced

### Financial Investigations

**Money Laundering Indicators**:

- Structuring transactions (under $10,000)
- Unusual cash deposits
- Wire transfers to high-risk jurisdictions
- Shell company transactions
- Real estate transactions above market value
- Rapid movement of funds
- Trade-based money laundering

**Investigation Tools**:

1. **Bank Records**
   - Subpoena or warrant required
   - Right to Financial Privacy Act compliance
   - Grand jury subpoenas
   - National Security Letters (limited circumstances)

2. **Suspicious Activity Reports (SARs)**
   - FinCEN access required
   - Cannot disclose SAR existence to subject
   - Use for predication and corroboration
   - Follow-up investigation

3. **Currency Transaction Reports (CTRs)**
   - Transactions over $10,000
   - Pattern analysis
   - Identify structuring

4. **Asset Forfeiture**
   - Criminal or civil forfeiture
   - Proper legal procedures
   - Innocent owner protections
   - Equitable sharing

### Victim Protection and Services

**Human Trafficking Victims**:

**DO**:
- Treat as victims, not criminals
- Provide immediate safety
- Connect with victim services
- Respect trauma and cultural sensitivity
- Document with minimal intrusion
- Provide T-visa information
- Ensure interpreter if needed

**DO NOT**:
- Interview without proper training
- Separate families unnecessarily
- Make promises you can't keep
- Share identifying information
- Photograph without necessity and consent

**Victim Services**:
- Shelter and housing
- Medical care
- Mental health services
- Legal assistance
- Case management
- Family reunification
- Witness protection (if needed)

**Data Protection**:
- Anonymous victim IDs only
- Extreme access restrictions
- Victim consent for data use
- Safety paramount in all decisions

### Multi-Agency Coordination

**Task Force Operations**:

**Structure**:
- Lead agency designated
- Memorandum of Understanding (MOU)
- Resource commitments
- Command structure
- Communication protocols

**Deconfliction**:
- Check RISSafe or equivalent
- Coordinate operations
- Avoid compromising other investigations
- Share intelligence appropriately

**International Cooperation**:

1. **Mutual Legal Assistance Treaties (MLAT)**
   - Formal requests through DOJ
   - Evidence admissibility considerations
   - Lengthy process (months)

2. **Law Enforcement Cooperation**
   - Interpol channels
   - Europol (for European cases)
   - Bilateral agreements
   - Attaché/liaison officers

3. **Joint Investigations**
   - Joint Investigation Teams (JITs)
   - Simultaneous operations
   - Shared intelligence
   - Legal jurisdiction considerations

### Undercover Operations

**Authorization Requirements**:
- Supervisory approval
- Undercover Review Committee (for sensitive ops)
- Legal counsel review
- Otherwise Illegal Activity (OIA) approval if needed

**Safety Protocols**:
- Cover story development
- Backup teams
- Communication plans
- Emergency extraction procedures
- Psychological support

**Legal Considerations**:
- Entrapment defense prevention
- Predisposition to commit crime
- Proportionality of inducements
- Recording of interactions

**Operational Guidelines**:
- Maintain cover
- Document all contacts
- Regular debriefs
- Evidence collection
- Exit strategy

### Prosecution Coordination

**Early Coordination**:
- Identify prosecutor early
- Regular case updates
- Search warrant review
- Legal strategy discussion
- Discovery planning

**Grand Jury**:
- Secrecy requirements (Rule 6(e))
- Witness preparation
- Evidence presentation
- Indictment strategy

**Trial Preparation**:
- Witness coordination
- Evidence organization
- Expert witnesses
- Demonstrative exhibits
- Testimony preparation

### Intelligence Analysis

**Link Analysis**:
- Identify relationships
- Map organization structure
- Find key nodes
- Predict associations

**Financial Analysis**:
- Follow the money
- Identify beneficial owners
- Track asset movement
- Quantify proceeds

**Communication Analysis**:
- Call pattern analysis
- Network diagrams
- Timeline development
- Code/slang interpretation

**Pattern Recognition**:
- Modus operandi
- Geographic patterns
- Temporal patterns
- Similar case comparison

### Technology Tools

**Database Systems**:
- Criminal history (NCIC)
- Financial (FinCEN)
- Immigration (TECS)
- Vehicle (NCIC)
- Intelligence databases

**Analytical Tools**:
- i2 Analyst's Notebook
- Palantir
- Link analysis software
- Geographic information systems (GIS)
- Social network analysis

**Digital Forensics**:
- EnCase
- FTK (Forensic Toolkit)
- Cellebrite (mobile)
- X1 Social Discovery
- Magnet AXIOM

**Open Source Intelligence (OSINT)**:
- Social media monitoring
- Public records
- News and media
- Dark web monitoring
- Corporate records

## Best Practices

### Documentation

- Detailed, contemporaneous notes
- Objective, factual reporting
- Proper grammar and spelling
- Consistent formatting
- Regular updates

### Operational Security

- Compartmentalize information
- Secure communications
- Cover for action
- Surveillance detection
- Electronic security

### Legal Compliance

- Know the law
- Consult legal counsel when uncertain
- Document legal authority
- Follow procedures exactly
- Respect constitutional rights

### Ethics

- Integrity in all actions
- Truthfulness in reporting
- Respect for rights
- Proper use of authority
- Accountability

## Common Pitfalls

❌ **Avoid**:
- Expired legal authority
- Inadequate predication
- Poor documentation
- Compromising other investigations
- Tunnel vision
- Constitutional violations
- Improper evidence handling
- Inadequate source documentation

✅ **Always**:
- Verify legal authority is current
- Document thoroughly
- Coordinate with other agencies
- Consider alternative theories
- Respect constitutional rights
- Maintain chain of custody
- Protect sources and methods

## Emergency Procedures

### Officer Safety Emergency
1. Call for backup
2. Ensure officer safety
3. Secure scene
4. Medical attention if needed
5. Notify supervisor
6. Document incident

### Source Compromise
1. Immediate safety assessment
2. Emergency relocation if needed
3. Notify supervisor and source unit
4. Assess investigation impact
5. Implement countermeasures
6. Document and report

### Legal Authority Invalidation
1. Cease affected activities immediately
2. Notify supervisor and legal counsel
3. Assess admissibility of evidence
4. Seek new authority if appropriate
5. Document all actions
6. Prosecutorial notification

### Data Breach
1. Contain breach immediately
2. Notify security officer
3. Assess compromised information
4. Victim/source notification if needed
5. Implement remediation
6. Incident report

---

**Classification**: UNCLASSIFIED//FOR OFFICIAL USE ONLY
**Last Updated**: 2025-11-20
**Distribution**: Law Enforcement Personnel Only
