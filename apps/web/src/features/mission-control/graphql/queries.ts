import { gql } from '@apollo/client'

export const GET_STRATEGIC_PLANS = gql`
  query GetStrategicPlans($filter: StrategicPlanFilter) {
    strategicPlans(filter: $filter) {
      data {
        id
        name
        status
        description
        startDate
        endDate
        objectives {
          id
          name
          status
          progress
          owner
        }
      }
    }
  }
`

export const GET_STRATEGIC_PLAN_DETAILS = gql`
  query GetStrategicPlanDetails($id: String!) {
    strategicPlan(id: $id) {
      id
      name
      description
      status
      startDate
      endDate
      objectives {
        id
        name
        description
        status
        progress
        owner
        startDate
        targetDate
        milestones {
          id
          name
          dueDate
          status
        }
      }
      initiatives {
        id
        name
        description
        status
        startDate
        endDate
        owner
        budget
        budgetUsed
        budgetUtilization
      }
      risks {
        id
        name
        description
        riskLevel
        status
        owner
        mitigationStrategies {
          id
          description
          type
          owner
          deadline
          status
        }
      }
      kpis {
        id
        name
        description
        currentValue
        targetValue
        unit
        trend
        achievement
      }
      resources {
        id
        type
        name
        allocated
        used
        utilizationRate
      }
    }
    planProgress(planId: $id) {
      overallProgress
      objectivesProgress {
        total
        completed
        onTrack
        atRisk
        blocked
      }
      initiativesProgress {
        total
        completed
        inProgress
        notStarted
      }
      milestonesProgress {
        total
        completed
        upcoming
        overdue
      }
      riskSummary {
        critical
        high
        medium
        low
      }
      healthScore
    }
    planTimeline(planId: $id) {
      events {
        id
        type
        date
        title
        description
        status
        relatedEntityId
        relatedEntityType
      }
    }
  }
`
