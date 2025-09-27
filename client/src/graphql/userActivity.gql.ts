import { gql } from '@apollo/client';

export const USER_ACTIVITY_DASHBOARD_QUERY = gql`
  query UserActivityDashboard($tenantId: String, $rangeStart: DateTime, $rangeEnd: DateTime, $limit: Int = 25) {
    userActivitySummary(tenantId: $tenantId, rangeStart: $rangeStart, rangeEnd: $rangeEnd) {
      totalLogins
      totalQueries
      uniqueUsers
      activeUsersByDay {
        date
        loginCount
        queryCount
      }
      topUsers {
        userId
        loginCount
        queryCount
        lastActiveAt
      }
    }
    recentUserActivity(
      tenantId: $tenantId
      rangeStart: $rangeStart
      rangeEnd: $rangeEnd
      limit: $limit
    ) {
      timestamp
      type
      userId
      metadata
    }
  }
`;
