import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useQuery} from '@tanstack/react-query';

import {theme, spacing, typography, shadows} from '../theme';
import {useAuth} from '../hooks/useAuth';

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  totalEntities: number;
  recentActivity: number;
}

interface RecentCase {
  id: string;
  title: string;
  status: 'open' | 'closed' | 'archived';
  updatedAt: string;
  priority: 'low' | 'medium' | 'high';
}

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const {user} = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard stats
  const {data: stats, isLoading: statsLoading, refetch: refetchStats} = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // TODO: Replace with actual API call
      return {
        totalCases: 42,
        activeCases: 15,
        totalEntities: 1247,
        recentActivity: 28,
      };
    },
  });

  // Fetch recent cases
  const {data: recentCases, isLoading: casesLoading, refetch: refetchCases} = useQuery<RecentCase[]>({
    queryKey: ['recent-cases'],
    queryFn: async () => {
      // TODO: Replace with actual API call
      return [
        {
          id: '1',
          title: 'Operation Phoenix',
          status: 'open',
          updatedAt: '2 hours ago',
          priority: 'high',
        },
        {
          id: '2',
          title: 'Cyber Incident Investigation',
          status: 'open',
          updatedAt: '5 hours ago',
          priority: 'medium',
        },
        {
          id: '3',
          title: 'Financial Fraud Analysis',
          status: 'open',
          updatedAt: '1 day ago',
          priority: 'high',
        },
      ];
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchCases()]);
    setRefreshing(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return theme.colors.outline;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return theme.colors.primary;
      case 'closed':
        return '#10b981';
      case 'archived':
        return theme.colors.outline;
      default:
        return theme.colors.outline;
    }
  };

  if (statsLoading || casesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Analyst'}</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications' as never)}>
          <Icon name="bell-outline" size={24} color={theme.colors.onSurface} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Icon name="briefcase" size={32} color={theme.colors.primary} />
          <Text style={styles.statValue}>{stats?.totalCases || 0}</Text>
          <Text style={styles.statLabel}>Total Cases</Text>
        </View>

        <View style={styles.statCard}>
          <Icon name="folder-open" size={32} color="#10b981" />
          <Text style={styles.statValue}>{stats?.activeCases || 0}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>

        <View style={styles.statCard}>
          <Icon name="database" size={32} color="#f59e0b" />
          <Text style={styles.statValue}>{stats?.totalEntities || 0}</Text>
          <Text style={styles.statLabel}>Entities</Text>
        </View>

        <View style={styles.statCard}>
          <Icon name="chart-line" size={32} color="#8b5cf6" />
          <Text style={styles.statValue}>{stats?.recentActivity || 0}</Text>
          <Text style={styles.statLabel}>Activity</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <Icon name="plus-circle" size={28} color={theme.colors.primary} />
            <Text style={styles.actionText}>New Case</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Search' as never)}>
            <Icon name="magnify" size={28} color={theme.colors.primary} />
            <Text style={styles.actionText}>Search</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Camera' as never, {mode: 'photo'} as never)}>
            <Icon name="camera" size={28} color={theme.colors.primary} />
            <Text style={styles.actionText}>Capture</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Map' as never)}>
            <Icon name="map" size={28} color={theme.colors.primary} />
            <Text style={styles.actionText}>Map View</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Cases */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Cases</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Cases' as never)}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {recentCases?.map((case_) => (
          <TouchableOpacity
            key={case_.id}
            style={styles.caseCard}
            onPress={() =>
              navigation.navigate('CaseDetails' as never, {caseId: case_.id} as never)
            }>
            <View style={styles.caseHeader}>
              <View style={styles.caseInfo}>
                <Text style={styles.caseTitle} numberOfLines={1}>
                  {case_.title}
                </Text>
                <Text style={styles.caseTime}>{case_.updatedAt}</Text>
              </View>
              <View style={[styles.priorityBadge, {backgroundColor: getPriorityColor(case_.priority) + '20'}]}>
                <Text style={[styles.priorityText, {color: getPriorityColor(case_.priority)}]}>
                  {case_.priority.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.caseFooter}>
              <View style={[styles.statusBadge, {backgroundColor: getStatusColor(case_.status) + '20'}]}>
                <Icon name="circle" size={8} color={getStatusColor(case_.status)} />
                <Text style={[styles.statusText, {color: getStatusColor(case_.status)}]}>
                  {case_.status.charAt(0).toUpperCase() + case_.status.slice(1)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sync Status */}
      <TouchableOpacity
        style={styles.syncCard}
        onPress={() => navigation.navigate('SyncStatus' as never)}>
        <Icon name="sync" size={20} color={theme.colors.primary} />
        <Text style={styles.syncText}>All data synced • Last sync: Just now</Text>
        <Icon name="chevron-right" size={20} color={theme.colors.outline} />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.caption,
    color: theme.colors.outline,
  },
  userName: {
    ...typography.h2,
    color: theme.colors.onSurface,
    marginTop: spacing.xs,
  },
  notificationButton: {
    position: 'relative',
    padding: spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '50%',
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    alignItems: 'center',
    margin: spacing.xs,
    ...shadows.small,
  },
  statValue: {
    ...typography.h2,
    color: theme.colors.onSurface,
    marginTop: spacing.sm,
  },
  statLabel: {
    ...typography.caption,
    color: theme.colors.outline,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: theme.colors.onSurface,
  },
  seeAllText: {
    ...typography.body,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  actionCard: {
    width: '25%',
    padding: spacing.xs,
    alignItems: 'center',
  },
  actionText: {
    ...typography.caption,
    color: theme.colors.onSurface,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  caseCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  caseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  caseInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  caseTitle: {
    ...typography.body,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  caseTime: {
    ...typography.small,
    color: theme.colors.outline,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    ...typography.small,
    fontWeight: '600',
  },
  caseFooter: {
    flexDirection: 'row',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    ...typography.small,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    ...shadows.small,
  },
  syncText: {
    ...typography.caption,
    color: theme.colors.onSurface,
    flex: 1,
    marginLeft: spacing.sm,
  },
});
