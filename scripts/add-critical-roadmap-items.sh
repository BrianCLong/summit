#!/bin/bash
# Script to add critical company success roadmap items to GitHub Project
# Usage: ./add-critical-roadmap-items.sh
#
# Prerequisites:
# - GitHub CLI installed (gh)
# - Authenticated with: gh auth login
# - Project number: 1 (TopicalityLLC)

set -e

PROJECT_NUMBER=1
ORG="TopicalityLLC"

# Get project ID
PROJECT_ID=$(gh api graphql -f query='
  query{
    organization(login: "'"$ORG"'"){
      projectV2(number: '"$PROJECT_NUMBER"') {
        id
      }
    }
  }' --jq '.data.organization.projectV2.id')

echo "Project ID: $PROJECT_ID"

# Array of all 53 critical items
ITEMS=(
  "GTM: Implement pricing/packaging experimentation framework"
  "GTM: Build lead generation and qualification pipeline automation"
  "GTM: Create sales playbooks for IC, enterprise, self-serve segments"
  "GTM: Develop competitive battlecards and positioning frameworks"
  "GTM: Build revenue operations and forecasting dashboard tools"
  "GTM: Create partner portal and optimize marketplace listings"
  "Customer Success: Build customer health scoring (125% NRR target)"
  "Customer Success: Implement onboarding automation tracking"
  "Customer Success: Create expansion playbooks and upsell triggers"
  "Customer Success: Establish customer advisory board program"
  "Customer Success: Build success metrics dashboards per segment"
  "Customer Success: Implement churn prediction (<6% churn target)"
  "Customer Success: Deploy usage analytics and adoption tracking"
  "Product-Market Fit: User research and feedback automation"
  "Product-Market Fit: A/B testing framework for key workflows"
  "Product-Market Fit: Product analytics instrumentation"
  "Product-Market Fit: Customer interview program"
  "Product-Market Fit: Feature usage analysis and sunset criteria"
  "Product-Market Fit: Competitive intelligence automation"
  "Enterprise: FedRAMP certification roadmap and tracking"
  "Enterprise: ICD 503 compliance for IC alignment"
  "Enterprise: SOC 2 Type II certification process"
  "Enterprise: Customer security questionnaire automation"
  "Enterprise: Procurement process optimization"
  "Enterprise: Reference architecture documentation library"
  "Enterprise: TCO/ROI calculators for enterprise sales"
  "Enterprise: Proof-of-value frameworks"
  "Monetization: Usage-based pricing implementation"
  "Monetization: Marketplace revenue share mechanism"
  "Monetization: Enterprise licensing models and SKUs"
  "Monetization: Channel partner compensation structures"
  "Monetization: Freemium conversion optimization engine"
  "Monetization: Multi-currency and international pricing"
  "Operations: Revenue recognition automation"
  "Operations: Customer data platform (CDP) integration"
  "Operations: Marketing automation workflows"
  "Operations: Sales CRM integration and data quality"
  "Operations: Customer communication templates"
  "Operations: Support ticket deflection and knowledge base"
  "Operations: Community platform and user-generated content"
  "Partnership: Partner certification program"
  "Partnership: Marketplace developer portal"
  "Partnership: Partner co-marketing automation"
  "Partnership: Integration marketplace curation system"
  "Partnership: Partner success metrics and incentive tracking"
  "Partnership: Technology alliance program structure"
  "Finance: Subscription billing automation system"
  "Finance: Revenue reporting dashboards ($149M target)"
  "Finance: Unit economics tracking per segment"
  "Finance: LTV:CAC ratio monitoring dashboard"
  "Finance: Cash flow forecasting system"
  "Finance: Investor reporting automation"
)

# Add each item as a draft issue to the project
for i in "${!ITEMS[@]}"; do
  ITEM="${ITEMS[$i]}"
  echo "Adding item $((i+1))/53: $ITEM"
  
  # Create draft issue
  ITEM_ID=$(gh api graphql -f query='
    mutation {
      addProjectV2DraftIssue(input: {
        projectId: "'"$PROJECT_ID"'"
        title: "'"$ITEM"'"
      }) {
        projectItem {
          id
        }
      }
    }' --jq '.data.addProjectV2DraftIssue.projectItem.id')
  
  echo "  Added: $ITEM_ID"
  sleep 0.5  # Rate limiting
done

echo ""
echo "Successfully added all 53 critical roadmap items!"
echo "View at: https://github.com/orgs/TopicalityLLC/projects/1"
