#!/usr/bin/env bash
# Populate all 9 bonus GitHub Projects with custom fields and sample items
set -euo pipefail

OWNER="${1:-BrianCLong}"

echo "🚀 Populating all 9 bonus GitHub Projects..."
echo ""

# Get project numbers
declare -A PROJECTS
while IFS=$'\t' read -r num title; do
  PROJECTS["$title"]="$num"
done < <(gh project list --owner "$OWNER" --format json | jq -r '.projects[] | "\(.number)\t\(.title)"')

# 1. Security & Compliance
PROJ="${PROJECTS[Security & Compliance — Controls & Audits]}"
if [ -n "$PROJ" ]; then
  echo "📋 Project #$PROJ: Security & Compliance"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Control ID" --data-type TEXT 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Framework" --data-type SINGLE_SELECT --single-select-options "SOC2,ISO27001,HIPAA,FedRAMP" 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Evidence Due" --data-type DATE 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Severity" --data-type SINGLE_SELECT --single-select-options "S0,S1,S2,S3" 2>/dev/null || echo "  Field exists"
  gh project item-create "$PROJ" --owner "$OWNER" --title "CC1.1 Logical Access Reviews" --body "Quarterly evidence collection for SOC2 audit" 2>/dev/null || true
  gh project item-create "$PROJ" --owner "$OWNER" --title "CC2.2 Change Management" --body "Review change logs and approvals" 2>/dev/null || true
  echo "  ✅ Done"
fi

# 2. Design System
PROJ="${PROJECTS[Design System — Tokens, Components, Adoption]}"
if [ -n "$PROJ" ]; then
  echo "📋 Project #$PROJ: Design System"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Component" --data-type TEXT 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Platform" --data-type SINGLE_SELECT --single-select-options "Web,iOS,Android,All" 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Version" --data-type TEXT 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Adoption %" --data-type NUMBER 2>/dev/null || echo "  Field exists"
  gh project item-create "$PROJ" --owner "$OWNER" --title "Button Component v2.0" --body "Update button with new design tokens" 2>/dev/null || true
  gh project item-create "$PROJ" --owner "$OWNER" --title "Color Tokens Migration" --body "Migrate from v1 to v2 color palette" 2>/dev/null || true
  echo "  ✅ Done"
fi

# 3. Content Calendar
PROJ="${PROJECTS[Content Calendar — GTM, Docs, Social]}"
if [ -n "$PROJ" ]; then
  echo "📋 Project #$PROJ: Content Calendar"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Content Type" --data-type SINGLE_SELECT --single-select-options "Blog,Doc,Video,Social,Whitepaper" 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Channel" --data-type SINGLE_SELECT --single-select-options "Website,Twitter,LinkedIn,YouTube,Email" 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Publish Date" --data-type DATE 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Stage" --data-type SINGLE_SELECT --single-select-options "Draft,Review,Approved,Published" 2>/dev/null || echo "  Field exists"
  gh project item-create "$PROJ" --owner "$OWNER" --title "Product Launch Blog Post" --body "Announce new features in Q4 release" 2>/dev/null || true
  gh project item-create "$PROJ" --owner "$OWNER" --title "Security Whitepaper" --body "Deep dive on zero-trust architecture" 2>/dev/null || true
  echo "  ✅ Done"
fi

# 4. Customer Feedback
PROJ="${PROJECTS[Customer Feedback — Intake & Insights]}"
if [ -n "$PROJ" ]; then
  echo "📋 Project #$PROJ: Customer Feedback"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Customer" --data-type TEXT 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Feedback Type" --data-type SINGLE_SELECT --single-select-options "Feature Request,Bug,Complaint,Praise" 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Impact Score" --data-type NUMBER 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Received Date" --data-type DATE 2>/dev/null || echo "  Field exists"
  gh project item-create "$PROJ" --owner "$OWNER" --title "Request: Bulk Export API" --body "Enterprise customer needs CSV export for 10M+ records" 2>/dev/null || true
  gh project item-create "$PROJ" --owner "$OWNER" --title "Request: SSO SAML Support" --body "Multiple customers asking for SAML integration" 2>/dev/null || true
  echo "  ✅ Done"
fi

# 5. Startup Ops
PROJ="${PROJECTS[Startup Ops — Company-Building Playbook]}"
if [ -n "$PROJ" ]; then
  echo "📋 Project #$PROJ: Startup Ops"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Category" --data-type SINGLE_SELECT --single-select-options "Fundraising,Hiring,Legal,Finance,GTM" 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Stage" --data-type SINGLE_SELECT --single-select-options "Seed,Series A,Series B,Growth" 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Due Date" --data-type DATE 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Priority" --data-type SINGLE_SELECT --single-select-options "P0,P1,P2" 2>/dev/null || echo "  Field exists"
  gh project item-create "$PROJ" --owner "$OWNER" --title "Series A Pitch Deck" --body "Finalize deck for investor meetings" 2>/dev/null || true
  gh project item-create "$PROJ" --owner "$OWNER" --title "Hire VP Engineering" --body "Interview candidates for engineering leadership" 2>/dev/null || true
  echo "  ✅ Done"
fi

# 6. SMB Finance
PROJ="${PROJECTS[SMB Finance — AP/AR/Procurement]}"
if [ -n "$PROJ" ]; then
  echo "📋 Project #$PROJ: SMB Finance"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Invoice #" --data-type TEXT 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Type" --data-type SINGLE_SELECT --single-select-options "AR,AP,Procurement,Expense" 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Amount" --data-type NUMBER 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Due Date" --data-type DATE 2>/dev/null || echo "  Field exists"
  gh project item-create "$PROJ" --owner "$OWNER" --title "Invoice INV-2025-001" --body "Payment due for AWS infrastructure Q4" 2>/dev/null || true
  gh project item-create "$PROJ" --owner "$OWNER" --title "Customer Payment: ACME Corp" --body "Receivable for annual subscription" 2>/dev/null || true
  echo "  ✅ Done"
fi

# 7. Gov Contracting
PROJ="${PROJECTS[Gov Contracting — FAR/DFARS Pipeline]}"
if [ -n "$PROJ" ]; then
  echo "📋 Project #$PROJ: Gov Contracting"
  gh project field-create "$PROJ" --owner "$OWNER" --name "RFP #" --data-type TEXT 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Agency" --data-type TEXT 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Response Due" --data-type DATE 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Status" --data-type SINGLE_SELECT --single-select-options "Reviewing,Drafting,Submitted,Awarded,Declined" 2>/dev/null || echo "  Field exists"
  gh project item-create "$PROJ" --owner "$OWNER" --title "RFP: DOD Cloud Migration" --body "Proposal for enterprise cloud infrastructure" 2>/dev/null || true
  gh project item-create "$PROJ" --owner "$OWNER" --title "RFP: NIST Cybersecurity Tools" --body "Security compliance automation platform" 2>/dev/null || true
  echo "  ✅ Done"
fi

# 8. Regulatory
PROJ="${PROJECTS[Regulatory — GDPR/CCPA/HIPAA]}"
if [ -n "$PROJ" ]; then
  echo "📋 Project #$PROJ: Regulatory"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Regulation" --data-type SINGLE_SELECT --single-select-options "GDPR,CCPA,HIPAA,SOX,FINRA" 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Filing Type" --data-type SINGLE_SELECT --single-select-options "DPA,DSAR,Breach,Audit,Policy" 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Deadline" --data-type DATE 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Risk" --data-type SINGLE_SELECT --single-select-options "Critical,High,Medium,Low" 2>/dev/null || echo "  Field exists"
  gh project item-create "$PROJ" --owner "$OWNER" --title "GDPR DSAR Response" --body "Respond to data subject access request within 30 days" 2>/dev/null || true
  gh project item-create "$PROJ" --owner "$OWNER" --title "HIPAA Breach Notification" --body "Report breach to HHS within 60 days" 2>/dev/null || true
  echo "  ✅ Done"
fi

# 9. GAAP Close
PROJ="${PROJECTS[GAAP Close — Financial Reporting]}"
if [ -n "$PROJ" ]; then
  echo "📋 Project #$PROJ: GAAP Close"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Period" --data-type TEXT 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Task Type" --data-type SINGLE_SELECT --single-select-options "Journal Entry,Reconciliation,Review,Report,Audit" 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Close Date" --data-type DATE 2>/dev/null || echo "  Field exists"
  gh project field-create "$PROJ" --owner "$OWNER" --name "Complete" --data-type SINGLE_SELECT --single-select-options "Yes,No,Blocked" 2>/dev/null || echo "  Field exists"
  gh project item-create "$PROJ" --owner "$OWNER" --title "Q4 2025 Revenue Recognition" --body "Record deferred revenue for Q4" 2>/dev/null || true
  gh project item-create "$PROJ" --owner "$OWNER" --title "October Bank Reconciliation" --body "Reconcile all bank accounts for Oct" 2>/dev/null || true
  echo "  ✅ Done"
fi

echo ""
echo "✅ All 9 bonus projects fully populated with custom fields and sample items!"
