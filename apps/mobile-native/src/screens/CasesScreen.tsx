import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {theme, spacing, typography, shadows} from '../theme';
import {Card, Badge, EmptyState, StatusIndicator} from '../components/UIComponents';
import {formatRelativeTime} from '../utils/formatters';

interface Case {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'investigating' | 'pending' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  entityCount: number;
  relationshipCount: number;
  tags: string[];
}

type FilterType = 'all' | 'active' | 'investigating' | 'pending' | 'closed';
type SortType = 'recent' | 'priority' | 'title';

const mockCases: Case[] = [
  {
    id: '1',
    title: 'Operation Phoenix',
    description: 'Cross-border financial investigation',
    status: 'active',
    priority: 'critical',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    assignedTo: 'Agent Smith',
    entityCount: 15,
    relationshipCount: 42,
    tags: ['Urgent', 'Financial', 'International'],
  },
  {
    id: '2',
    title: 'Corporate Fraud Case',
    description: 'Internal fraud investigation at Acme Corp',
    status: 'investigating',
    priority: 'high',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    assignedTo: 'Agent Johnson',
    entityCount: 8,
    relationshipCount: 23,
    tags: ['Corporate', 'Fraud'],
  },
  {
    id: '3',
    title: 'Cyber Security Incident',
    description: 'Data breach investigation',
    status: 'pending',
    priority: 'medium',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    entityCount: 3,
    relationshipCount: 7,
    tags: ['Cyber', 'Security'],
  },
  {
    id: '4',
    title: 'Asset Recovery',
    description: 'Tracking stolen assets',
    status: 'closed',
    priority: 'low',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: 'Agent Brown',
    entityCount: 12,
    relationshipCount: 31,
    tags: ['Asset Recovery', 'Closed'],
  },
];

export const CasesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('recent');

  const {data: cases, isLoading, refetch} = useQuery<Case[]>({
    queryKey: ['cases', activeFilter, sortBy],
    queryFn: async () => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 800));

      let filtered = mockCases;
      if (activeFilter !== 'all') {
        filtered = mockCases.filter(c => c.status === activeFilter);
      }

      // Sort
      const sorted = [...filtered].sort((a, b) => {
        switch (sortBy) {
          case 'recent':
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          case 'priority':
            const priorityOrder = {critical: 0, high: 1, medium: 2, low: 3};
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          case 'title':
            return a.title.localeCompare(b.title);
          default:
            return 0;
        }
      });

      return sorted;
    },
  });

  const getPriorityColor = (priority: Case['priority']) => {
    switch (priority) {
      case 'critical':
        return theme.colors.error;
      case 'high':
        return theme.colors.warning;
      case 'medium':
        return '#FF9800';
      case 'low':
        return theme.colors.textSecondary;
    }
  };

  const getStatusColor = (status: Case['status']) => {
    switch (status) {
      case 'active':
        return theme.colors.success;
      case 'investigating':
        return theme.colors.info;
      case 'pending':
        return theme.colors.warning;
      case 'closed':
        return theme.colors.textSecondary;
    }
  };

  const renderFilterChip = (filter: FilterType, label: string) => (
    <TouchableOpacity
      key={filter}
      onPress={() => setActiveFilter(filter)}
      style={[
        styles.filterChip,
        activeFilter === filter && styles.filterChipActive,
      ]}>
      <Text
        style={[
          styles.filterChipText,
          activeFilter === filter && styles.filterChipTextActive,
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderCaseCard = ({item}: {item: Case}) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('EntityDetail' as never, {id: item.id} as never)}>
      <Card style={styles.caseCard}>
        <View style={styles.caseHeader}>
          <View style={styles.caseHeaderTop}>
            <View style={styles.caseTitleRow}>
              <Icon
                name="briefcase"
                size={20}
                color={theme.colors.primary}
                style={styles.caseIcon}
              />
              <Text style={styles.caseTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
            <View style={[styles.priorityBadge, {backgroundColor: getPriorityColor(item.priority) + '20'}]}>
              <Icon name="flag" size={12} color={getPriorityColor(item.priority)} />
            </View>
          </View>
          <Text style={styles.caseDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>

        <View style={styles.caseStats}>
          <View style={styles.statItem}>
            <Icon name="account-group" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>{item.entityCount}</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="link-variant" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>{item.relationshipCount}</Text>
          </View>
          <StatusIndicator status={item.status} label={item.status} />
        </View>

        <View style={styles.caseFooter}>
          <View style={styles.caseMetadata}>
            {item.assignedTo && (
              <View style={styles.assignedTo}>
                <Icon name="account" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.assignedToText}>{item.assignedTo}</Text>
              </View>
            )}
            <Text style={styles.timestamp}>
              Updated {formatRelativeTime(item.updatedAt)}
            </Text>
          </View>
        </View>

        {item.tags.length > 0 && (
          <View style={styles.caseTags}>
            {item.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>Cases</Text>
        <TouchableOpacity style={styles.addButton}>
          <Icon name="plus" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}>
        {renderFilterChip('all', 'All')}
        {renderFilterChip('active', 'Active')}
        {renderFilterChip('investigating', 'Investigating')}
        {renderFilterChip('pending', 'Pending')}
        {renderFilterChip('closed', 'Closed')}
      </ScrollView>

      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <View style={styles.sortButtons}>
          {(['recent', 'priority', 'title'] as SortType[]).map(sort => (
            <TouchableOpacity
              key={sort}
              onPress={() => setSortBy(sort)}
              style={[styles.sortButton, sortBy === sort && styles.sortButtonActive]}>
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === sort && styles.sortButtonTextActive,
                ]}>
                {sort.charAt(0).toUpperCase() + sort.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={cases}
        renderItem={renderCaseCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="briefcase-outline"
              title="No Cases Found"
              message={
                activeFilter === 'all'
                  ? 'No cases available. Create a new case to get started.'
                  : `No ${activeFilter} cases found.`
              }
            />
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    ...shadows.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.fonts.bold,
    color: theme.colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    marginBottom: spacing.sm,
  },
  filtersContent: {
    paddingHorizontal: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary + '15',
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.medium,
  },
  filterChipTextActive: {
    color: theme.colors.primary,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  sortLabel: {
    fontSize: typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.medium,
    marginRight: spacing.sm,
  },
  sortButtons: {
    flexDirection: 'row',
    flex: 1,
  },
  sortButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  sortButtonActive: {
    backgroundColor: theme.colors.primary + '15',
  },
  sortButtonText: {
    fontSize: typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.medium,
  },
  sortButtonTextActive: {
    color: theme.colors.primary,
  },
  listContent: {
    padding: spacing.md,
  },
  caseCard: {
    marginBottom: spacing.md,
  },
  caseHeader: {
    marginBottom: spacing.sm,
  },
  caseHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  caseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  caseIcon: {
    marginRight: spacing.xs,
  },
  caseTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semibold,
    color: theme.colors.text,
  },
  priorityBadge: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  caseDescription: {
    fontSize: typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.regular,
    lineHeight: 20,
  },
  caseStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  statText: {
    fontSize: typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.medium,
    marginLeft: spacing.xs,
  },
  caseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  caseMetadata: {
    flex: 1,
  },
  assignedTo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  assignedToText: {
    fontSize: typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.regular,
    marginLeft: spacing.xs,
  },
  timestamp: {
    fontSize: typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.regular,
  },
  caseTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary + '10',
  },
  tagText: {
    fontSize: typography.sizes.xs,
    color: theme.colors.primary,
    fontFamily: typography.fonts.medium,
  },
});
