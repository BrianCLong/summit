# Government AI Governance Policy
#
# Open Policy Agent rules for ethical, transparent, and compliant
# government AI operations.
#
# SPDX-License-Identifier: Apache-2.0

package summit.gov.ai

import future.keywords.if
import future.keywords.in

# Default deny
default allow := false
default require_human_review := true

# ============================================================================
# AI Model Deployment Rules
# ============================================================================

# Allow deployment if model passes all governance checks
allow if {
    input.action == "deploy_model"
    model_governance_approved
    ethical_review_passed
    compliance_threshold_met
    not unacceptable_risk
}

model_governance_approved if {
    input.model.ethicalReview.overallStatus == "approved"
}

ethical_review_passed if {
    all_principles_assessed
    no_non_compliant_findings
}

all_principles_assessed if {
    required_principles := {
        "fairness", "accountability", "transparency",
        "privacy", "security", "human_oversight",
        "non_discrimination", "explainability"
    }
    assessed := {p | p := input.model.ethicalReview.principlesAssessed[_]}
    count(required_principles - assessed) == 0
}

no_non_compliant_findings if {
    non_compliant := [f |
        f := input.model.ethicalReview.findings[_]
        f.status == "non_compliant"
    ]
    count(non_compliant) == 0
}

compliance_threshold_met if {
    input.complianceScore >= 80
}

unacceptable_risk if {
    input.model.riskLevel == "unacceptable"
}

# ============================================================================
# Human Oversight Requirements
# ============================================================================

# High-risk decisions require human review
require_human_review if {
    input.action == "make_decision"
    input.model.riskLevel == "high"
}

# Decisions affecting fundamental rights require human review
require_human_review if {
    input.action == "make_decision"
    affects_fundamental_rights
}

affects_fundamental_rights if {
    fundamental_categories := {
        "employment", "credit", "housing", "education",
        "healthcare", "benefits", "law_enforcement"
    }
    input.decisionCategory in fundamental_categories
}

# Low confidence decisions require human review
require_human_review if {
    input.action == "make_decision"
    input.confidence < 0.8
}

# Allow automated decision only if human review not required
allow if {
    input.action == "make_decision"
    not require_human_review
    model_authorized
    consent_verified
}

model_authorized if {
    input.model.deploymentEnvironments[_] == input.environment
}

consent_verified if {
    input.citizenConsent.consentGiven == true
    purpose_allowed
}

purpose_allowed if {
    input.purpose in input.citizenConsent.purposes
}

# ============================================================================
# Citizen Data Access Rules
# ============================================================================

# Citizens can always access their own data
allow if {
    input.action == "access_data"
    input.requestor.type == "citizen"
    input.requestor.id == input.subject.id
}

# Citizens can export their data (portability)
allow if {
    input.action == "export_data"
    input.requestor.type == "citizen"
    input.requestor.id == input.subject.id
}

# Citizens can request data deletion
allow if {
    input.action == "delete_data"
    input.requestor.type == "citizen"
    input.requestor.id == input.subject.id
    not legal_hold
}

legal_hold if {
    input.subject.legalHold == true
}

# ============================================================================
# Transparency Requirements
# ============================================================================

# All AI decisions must be explainable
explanation_required if {
    input.action == "make_decision"
}

# Appeals must be allowed for high-impact decisions
appeal_allowed if {
    input.action == "appeal_decision"
    input.decision.appealable == true
    not appeal_deadline_passed
}

appeal_deadline_passed if {
    input.decision.appealDeadline
    time.now_ns() > time.parse_rfc3339_ns(input.decision.appealDeadline)
}

# ============================================================================
# Audit Requirements
# ============================================================================

# All governance actions must be logged
audit_required if {
    governance_actions := {
        "deploy_model", "make_decision", "access_data",
        "export_data", "delete_data", "appeal_decision",
        "register_model", "update_consent"
    }
    input.action in governance_actions
}

# Audit must include minimum fields
audit_complete if {
    input.audit.timestamp
    input.audit.actor
    input.audit.action
    input.audit.resource
    input.audit.outcome
}

# ============================================================================
# Bias Detection Rules
# ============================================================================

# Flag potential bias if disparate impact exceeds threshold
bias_alert if {
    some attr in input.model.biasAssessment.protectedAttributes
    ratio := input.model.biasAssessment.disparateImpactRatios[attr]
    ratio < 0.8  # Four-fifths rule
}

bias_alert if {
    some attr in input.model.biasAssessment.protectedAttributes
    ratio := input.model.biasAssessment.disparateImpactRatios[attr]
    ratio > 1.25  # Inverse four-fifths
}
