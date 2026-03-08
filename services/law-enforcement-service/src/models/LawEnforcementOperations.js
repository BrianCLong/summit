"use strict";
/**
 * Law Enforcement Operations Support Models
 *
 * LEGAL NOTICE: For authorized law enforcement use only.
 * All operations must comply with applicable laws and constitutional protections.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskForceSchema = exports.InformantManagementSchema = exports.SurveillanceOperationSchema = exports.InvestigationCaseSchema = exports.OperationType = void 0;
const zod_1 = require("zod");
var OperationType;
(function (OperationType) {
    OperationType["INVESTIGATION"] = "INVESTIGATION";
    OperationType["SURVEILLANCE"] = "SURVEILLANCE";
    OperationType["UNDERCOVER"] = "UNDERCOVER";
    OperationType["WIRETAP"] = "WIRETAP";
    OperationType["RAID"] = "RAID";
    OperationType["ARREST"] = "ARREST";
    OperationType["ASSET_SEIZURE"] = "ASSET_SEIZURE";
    OperationType["SEARCH_WARRANT"] = "SEARCH_WARRANT";
    OperationType["STING_OPERATION"] = "STING_OPERATION";
    OperationType["CONTROLLED_DELIVERY"] = "CONTROLLED_DELIVERY";
    OperationType["TASK_FORCE"] = "TASK_FORCE";
    OperationType["INTERNATIONAL_COOPERATION"] = "INTERNATIONAL_COOPERATION";
})(OperationType || (exports.OperationType = OperationType = {}));
exports.InvestigationCaseSchema = zod_1.z.object({
    caseId: zod_1.z.string(),
    caseNumber: zod_1.z.string(),
    caseName: zod_1.z.string(),
    // Legal authority
    legalAuthorities: zod_1.z.array(zod_1.z.object({
        authorityType: zod_1.z.enum(['WARRANT', 'GRAND_JURY', 'COURT_ORDER', 'ADMINISTRATIVE', 'INTELLIGENCE']),
        documentNumber: zod_1.z.string(),
        issuedBy: zod_1.z.string(), // Court/judge
        issuedDate: zod_1.z.date(),
        expirationDate: zod_1.z.date().optional(),
        scope: zod_1.z.string(),
        limitations: zod_1.z.array(zod_1.z.string()).optional()
    })),
    classificationLevel: zod_1.z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),
    // Case details
    investigationType: zod_1.z.enum([
        'ORGANIZED_CRIME',
        'DRUG_TRAFFICKING',
        'HUMAN_TRAFFICKING',
        'WEAPONS_TRAFFICKING',
        'FINANCIAL_CRIME',
        'CYBERCRIME',
        'CORRUPTION',
        'TERRORISM',
        'VIOLENT_CRIME',
        'OTHER'
    ]),
    description: zod_1.z.string(),
    openedDate: zod_1.z.date(),
    status: zod_1.z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED_ARRESTED', 'CLOSED_PROSECUTED', 'CLOSED_UNFOUNDED']),
    // Involved entities
    subjects: zod_1.z.array(zod_1.z.object({
        entityId: zod_1.z.string(),
        role: zod_1.z.enum(['PRIMARY_SUBJECT', 'SECONDARY_SUBJECT', 'ASSOCIATE', 'SUSPECT', 'PERSON_OF_INTEREST']),
        charges: zod_1.z.array(zod_1.z.string()).optional(),
        status: zod_1.z.enum(['UNDER_INVESTIGATION', 'ARRESTED', 'INDICTED', 'FUGITIVE', 'DECEASED'])
    })),
    organizationIds: zod_1.z.array(zod_1.z.string()).optional(),
    // Investigation team
    leadAgency: zod_1.z.string(),
    participatingAgencies: zod_1.z.array(zod_1.z.string()),
    caseAgents: zod_1.z.array(zod_1.z.object({
        agentId: zod_1.z.string(),
        agency: zod_1.z.string(),
        role: zod_1.z.enum(['CASE_AGENT', 'CO_CASE_AGENT', 'SUPPORTING_AGENT', 'ANALYST', 'PROSECUTOR'])
    })),
    prosecutor: zod_1.z.object({
        name: zod_1.z.string(),
        office: zod_1.z.string(),
        contactInfo: zod_1.z.string().optional()
    }).optional(),
    // Evidence tracking
    evidence: zod_1.z.array(zod_1.z.object({
        evidenceId: zod_1.z.string(),
        type: zod_1.z.enum([
            'PHYSICAL',
            'DOCUMENTARY',
            'DIGITAL',
            'FINANCIAL_RECORDS',
            'SURVEILLANCE_VIDEO',
            'AUDIO_RECORDING',
            'TESTIMONY',
            'FORENSIC',
            'OTHER'
        ]),
        description: zod_1.z.string(),
        collectedDate: zod_1.z.date(),
        collectedBy: zod_1.z.string(),
        location: zod_1.z.string(), // Evidence storage
        chainOfCustody: zod_1.z.array(zod_1.z.object({
            date: zod_1.z.date(),
            transferredFrom: zod_1.z.string(),
            transferredTo: zod_1.z.string(),
            purpose: zod_1.z.string()
        }))
    })).optional(),
    // Operations
    operations: zod_1.z.array(zod_1.z.string()), // Operation IDs
    // Intelligence
    intelligenceSources: zod_1.z.array(zod_1.z.string()),
    relatedCases: zod_1.z.array(zod_1.z.string()).optional(),
    // Outcome
    arrests: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.date(),
        entityId: zod_1.z.string(),
        charges: zod_1.z.array(zod_1.z.string()),
        arrestingAgency: zod_1.z.string(),
        location: zod_1.z.string()
    })).optional(),
    seizures: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.date(),
        type: zod_1.z.enum(['DRUGS', 'WEAPONS', 'CASH', 'PROPERTY', 'VEHICLES', 'CRYPTOCURRENCY', 'OTHER']),
        description: zod_1.z.string(),
        estimatedValue: zod_1.z.number().optional(),
        quantity: zod_1.z.string().optional()
    })).optional(),
    // Prosecution
    prosecution: zod_1.z.object({
        filed: zod_1.z.boolean(),
        filingDate: zod_1.z.date().optional(),
        court: zod_1.z.string().optional(),
        docketNumber: zod_1.z.string().optional(),
        charges: zod_1.z.array(zod_1.z.string()).optional(),
        trialDate: zod_1.z.date().optional(),
        verdict: zod_1.z.string().optional(),
        sentence: zod_1.z.string().optional()
    }).optional(),
    // Metadata
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    closedDate: zod_1.z.date().optional(),
    // Audit trail
    auditLog: zod_1.z.array(zod_1.z.object({
        accessedBy: zod_1.z.string(),
        accessedAt: zod_1.z.date(),
        action: zod_1.z.string(),
        changes: zod_1.z.string().optional()
    }))
});
exports.SurveillanceOperationSchema = zod_1.z.object({
    operationId: zod_1.z.string(),
    operationName: zod_1.z.string(),
    operationType: zod_1.z.nativeEnum(OperationType),
    // Legal authority - REQUIRED
    legalAuthority: zod_1.z.object({
        authorityType: zod_1.z.enum(['WARRANT', 'COURT_ORDER', 'FISA', 'TITLE_III', 'PEN_REGISTER', 'CONSENT']),
        documentNumber: zod_1.z.string(),
        issuedBy: zod_1.z.string(),
        issuedDate: zod_1.z.date(),
        expirationDate: zod_1.z.date(),
        scope: zod_1.z.string(),
        reportingRequirements: zod_1.z.array(zod_1.z.string()).optional()
    }),
    // Case linkage
    caseId: zod_1.z.string(),
    caseNumber: zod_1.z.string(),
    // Targets
    targets: zod_1.z.array(zod_1.z.object({
        entityId: zod_1.z.string(),
        targetType: zod_1.z.enum(['PERSON', 'LOCATION', 'PHONE', 'EMAIL', 'VEHICLE', 'ORGANIZATION']),
        justification: zod_1.z.string()
    })),
    // Operation details
    startDate: zod_1.z.date(),
    endDate: zod_1.z.date().optional(),
    status: zod_1.z.enum(['PLANNED', 'APPROVED', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'SUSPENDED']),
    // Surveillance methods
    methods: zod_1.z.array(zod_1.z.enum([
        'PHYSICAL_SURVEILLANCE',
        'VIDEO_SURVEILLANCE',
        'AUDIO_SURVEILLANCE',
        'WIRETAP',
        'ELECTRONIC_MONITORING',
        'GPS_TRACKING',
        'CELL_SITE_SIMULATOR',
        'PEN_REGISTER',
        'TRAP_AND_TRACE',
        'MAIL_COVER',
        'UNDERCOVER'
    ])),
    // Team
    operatingAgency: zod_1.z.string(),
    teamMembers: zod_1.z.array(zod_1.z.object({
        agentId: zod_1.z.string(),
        role: zod_1.z.string()
    })),
    // Results
    intelligenceGathered: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.date(),
        type: zod_1.z.string(),
        summary: zod_1.z.string(),
        evidenceId: zod_1.z.string().optional()
    })).optional(),
    // Reporting
    progressReports: zod_1.z.array(zod_1.z.object({
        reportDate: zod_1.z.date(),
        reportedTo: zod_1.z.string(), // Court/supervisor
        summary: zod_1.z.string(),
        interceptsCaptured: zod_1.z.number().optional()
    })).optional(),
    // Metadata
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
exports.InformantManagementSchema = zod_1.z.object({
    informantId: zod_1.z.string(), // Anonymous ID
    codeNumber: zod_1.z.string(), // Agency code number for informant
    // HIGHLY RESTRICTED - Informant safety is paramount
    handlingAgency: zod_1.z.string(),
    handlingAgent: zod_1.z.string(), // Primary handler
    // Informant details (minimal, protected)
    reliability: zod_1.z.enum(['RELIABLE', 'USUALLY_RELIABLE', 'UNRELIABLE', 'UNTESTED']),
    motivations: zod_1.z.array(zod_1.z.enum([
        'FINANCIAL',
        'COOPERATION_AGREEMENT',
        'REVENGE',
        'CONSCIENCE',
        'FEAR',
        'IDEOLOGY',
        'UNKNOWN'
    ])),
    // Status
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED', 'COMPROMISED', 'RELOCATED']),
    activatedDate: zod_1.z.date(),
    // Operations and intelligence
    casesInvolved: zod_1.z.array(zod_1.z.string()), // Case IDs
    intelligenceProvided: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.date(),
        caseId: zod_1.z.string(),
        intelligenceType: zod_1.z.string(),
        reliability: zod_1.z.enum(['CONFIRMED', 'PROBABLE', 'POSSIBLE', 'DOUBTFUL']),
        value: zod_1.z.enum(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'])
    })),
    // Payments (if applicable)
    paymentsAuthorized: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.date(),
        amount: zod_1.z.number(),
        purpose: zod_1.z.string(),
        approvedBy: zod_1.z.string()
    })).optional(),
    // Risk assessment
    riskLevel: zod_1.z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']),
    safetyMeasures: zod_1.z.array(zod_1.z.string()),
    // Access restrictions - MOST RESTRICTIVE
    accessRestrictions: zod_1.z.array(zod_1.z.string()),
    // Audit trail with extreme protection
    auditLog: zod_1.z.array(zod_1.z.object({
        accessedBy: zod_1.z.string(),
        accessedAt: zod_1.z.date(),
        action: zod_1.z.string(),
        justification: zod_1.z.string(),
        approvedBy: zod_1.z.string() // Supervisor approval required
    }))
});
exports.TaskForceSchema = zod_1.z.object({
    taskForceId: zod_1.z.string(),
    taskForceName: zod_1.z.string(),
    // Mission
    mission: zod_1.z.string(),
    focus: zod_1.z.array(zod_1.z.string()),
    // Agencies
    leadAgency: zod_1.z.string(),
    participatingAgencies: zod_1.z.array(zod_1.z.object({
        agency: zod_1.z.string(),
        personnelCommitted: zod_1.z.number(),
        resources: zod_1.z.array(zod_1.z.string())
    })),
    // Leadership
    commander: zod_1.z.object({
        name: zod_1.z.string(),
        agency: zod_1.z.string(),
        rank: zod_1.z.string()
    }),
    // Operations
    establishedDate: zod_1.z.date(),
    disbandedDate: zod_1.z.date().optional(),
    status: zod_1.z.enum(['ACTIVE', 'SUSPENDED', 'DISBANDED']),
    // Cases
    activeCases: zod_1.z.array(zod_1.z.string()), // Case IDs
    closedCases: zod_1.z.array(zod_1.z.string()).optional(),
    // Results
    statistics: zod_1.z.object({
        arrests: zod_1.z.number(),
        indictments: zod_1.z.number(),
        convictions: zod_1.z.number(),
        drugsSeized: zod_1.z.string().optional(),
        assetsSeized: zod_1.z.number().optional(),
        organizationsDisrupted: zod_1.z.number().optional()
    }).optional(),
    // Resources
    funding: zod_1.z.object({
        totalBudget: zod_1.z.number(),
        federalFunding: zod_1.z.number().optional(),
        stateFunding: zod_1.z.number().optional(),
        localFunding: zod_1.z.number().optional()
    }).optional()
});
