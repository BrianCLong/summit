import { useState, useEffect } from 'react';
import { useSubscription, gql } from '@apollo/client';

// GraphQL Subscriptions for real-time updates
const LIVE_GRAPH_UPDATES = gql`
  subscription LiveGraphUpdates {
    graphUpdated {
      type
      entity {
        id
        label
        type
        properties
        timestamp
      }
      relationship {
        id
        from
        to
        type
        strength
        timestamp
      }
      user {
        id
        name
        action
      }
    }
  }
`;

const LIVE_INVESTIGATION_UPDATES = gql`
  subscription LiveInvestigationUpdates($investigationId: ID!) {
    investigationUpdated(investigationId: $investigationId) {
      id
      name
      status
      priority
      lastModified
      collaborators {
        id
        name
        isOnline
        lastActivity
      }
      recentActivity {
        id
        action
        user
        timestamp
        details
      }
    }
  }
`;

const LIVE_AI_INSIGHTS = gql`
  subscription LiveAIInsights {
    aiInsightGenerated {
      id
      type
      confidence
      message
      affectedEntities
      suggestedActions
      timestamp
    }
  }
`;

// Custom hook for real-time graph updates
export function useRealTimeGraph() {
  const [liveUpdates, setLiveUpdates] = useState([]);
  const [connectedUsers, setConnectedUsers] = useState([]);

  // Simulate real-time updates (replace with actual GraphQL subscription)
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate new entity detection
      if (Math.random() > 0.7) {
        const newUpdate = {
          id: Date.now(),
          type: 'ENTITY_ADDED',
          entity: {
            id: `entity_${Date.now()}`,
            label: `Person ${Math.floor(Math.random() * 1000)}`,
            type: 'person',
            confidence: (Math.random() * 40 + 60).toFixed(0),
            timestamp: new Date(),
          },
          user: {
            name: ['Alice Chen', 'Bob Rodriguez', 'Carol Kim'][
              Math.floor(Math.random() * 3)
            ],
            action: 'discovered',
          },
        };
        setLiveUpdates((prev) => [newUpdate, ...prev.slice(0, 9)]);
      }

      // Simulate connection strength changes
      if (Math.random() > 0.8) {
        const connectionUpdate = {
          id: Date.now(),
          type: 'RELATIONSHIP_UPDATED',
          relationship: {
            from: 'person1',
            to: 'org1',
            type: 'works_at',
            strength: Math.random(),
            confidence: (Math.random() * 30 + 70).toFixed(0),
          },
          user: {
            name: 'AI Assistant',
            action: 'analyzed',
          },
        };
        setLiveUpdates((prev) => [connectionUpdate, ...prev.slice(0, 9)]);
      }
    }, 4000);

    // Simulate connected users
    const userInterval = setInterval(() => {
      const users = [
        {
          id: 1,
          name: 'Alice Chen',
          isOnline: true,
          role: 'Senior Analyst',
          lastActivity: 'Graph Explorer',
        },
        {
          id: 2,
          name: 'Bob Rodriguez',
          isOnline: Math.random() > 0.3,
          role: 'Lead Investigator',
          lastActivity: 'AI Copilot',
        },
        {
          id: 3,
          name: 'Carol Kim',
          isOnline: Math.random() > 0.5,
          role: 'Intelligence Officer',
          lastActivity: 'Dashboard',
        },
        {
          id: 4,
          name: 'David Park',
          isOnline: Math.random() > 0.7,
          role: 'Data Analyst',
          lastActivity: 'Reports',
        },
      ];
      setConnectedUsers(users);
    }, 8000);

    return () => {
      clearInterval(interval);
      clearInterval(userInterval);
    };
  }, []);

  return {
    liveUpdates,
    connectedUsers,
    isConnected: true,
  };
}

// Custom hook for AI insights
export function useAIInsights() {
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        const aiInsights = [
          {
            type: 'PATTERN_DETECTED',
            confidence: 85,
            message:
              'Unusual communication pattern detected between financial entities',
            icon: '🔍',
            priority: 'high',
          },
          {
            type: 'ANOMALY_FOUND',
            confidence: 72,
            message: 'Geographic clustering suggests coordinated activity',
            icon: '📍',
            priority: 'medium',
          },
          {
            type: 'PREDICTION',
            confidence: 91,
            message:
              'High probability of new connections forming within 48 hours',
            icon: '🔮',
            priority: 'high',
          },
          {
            type: 'THREAT_ASSESSMENT',
            confidence: 78,
            message: 'Risk level elevated due to recent behavioral changes',
            icon: '⚠️',
            priority: 'high',
          },
          {
            type: 'RECOMMENDATION',
            confidence: 94,
            message: 'Suggest cross-referencing with Case #2847B',
            icon: '💡',
            priority: 'medium',
          },
        ];

        const newInsight = {
          id: Date.now(),
          ...aiInsights[Math.floor(Math.random() * aiInsights.length)],
          timestamp: new Date(),
          affectedEntities: Math.floor(Math.random() * 5) + 1,
        };

        setInsights((prev) => [newInsight, ...prev.slice(0, 7)]);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return insights;
}

// Custom hook for investigation collaboration
export function useInvestigationCollab(investigationId) {
  const [collaborators, setCollaborators] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const activities = [
        'Added new entity to graph',
        'Updated relationship strength',
        'Generated threat assessment',
        'Added evidence document',
        'Created timeline marker',
        'Shared insight with team',
        'Flagged suspicious activity',
        'Cross-referenced database',
      ];

      const users = [
        'Alice Chen',
        'Bob Rodriguez',
        'Carol Kim',
        'AI Assistant',
      ];

      const newActivity = {
        id: Date.now(),
        action: activities[Math.floor(Math.random() * activities.length)],
        user: users[Math.floor(Math.random() * users.length)],
        timestamp: new Date(),
        investigationId,
      };

      setRecentActivity((prev) => [newActivity, ...prev.slice(0, 19)]);
    }, 7000);

    return () => clearInterval(interval);
  }, [investigationId]);

  return {
    collaborators,
    recentActivity,
  };
}
