import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {useRoute, RouteProp} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {theme, spacing, typography, shadows} from '../theme';
import {Card, Badge, StatusIndicator, Avatar, Chip} from '../components/UIComponents';
import {formatRelativeTime, formatDate} from '../utils/formatters';

type TabType = 'overview' | 'relationships' | 'timeline' | 'documents';

interface Entity {
  id: string;
  name: string;
  type: 'person' | 'organization' | 'location' | 'event';
  status: 'active' | 'inactive' | 'flagged';
  risk: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  imageUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  nationality?: string;
  tags: string[];
  linkedCases: number;
  relationships: number;
  documents: number;
  createdAt: string;
  updatedAt: string;
}

interface Relationship {
  id: string;
  targetName: string;
  targetType: 'person' | 'organization';
  relationshipType: string;
  strength: number;
  since: string;
}

interface TimelineEvent {
  id: string;
  type: 'created' | 'updated' | 'linked' | 'flagged' | 'note';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
}

const {width} = Dimensions.get('window');

export const EntityDetailsScreen: React.FC = () => {
  const route = useRoute<RouteProp<{params: {id: string}}>>();
  const entityId = route.params?.id || '1';
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const {data: entity} = useQuery<Entity>({
    queryKey: ['entity', entityId],
    queryFn: async () => {
      // Mock entity data
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        id: entityId,
        name: 'John Smith',
        type: 'person',
        status: 'active',
        risk: 'high',
        description:
          'Suspected financial fraud operative with international connections. Under active investigation for money laundering activities.',
        email: 'john.smith@example.com',
        phone: '+1 (555) 123-4567',
        address: '123 Main St, San Francisco, CA 94102',
        dateOfBirth: '1980-05-15',
        nationality: 'United States',
        tags: ['High Priority', 'Financial', 'International', 'Under Investigation'],
        linkedCases: 3,
        relationships: 12,
        documents: 24,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      };
    },
  });

  const {data: relationships} = useQuery<Relationship[]>({
    queryKey: ['entity-relationships', entityId],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return [
        {
          id: 'r1',
          targetName: 'Acme Corporation',
          targetType: 'organization',
          relationshipType: 'Employee',
          strength: 0.9,
          since: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'r2',
          targetName: 'Jane Doe',
          targetType: 'person',
          relationshipType: 'Associate',
          strength: 0.75,
          since: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'r3',
          targetName: 'Offshore Ltd',
          targetType: 'organization',
          relationshipType: 'Director',
          strength: 0.85,
          since: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
    },
  });

  const {data: timeline} = useQuery<TimelineEvent[]>({
    queryKey: ['entity-timeline', entityId],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return [
        {
          id: 't1',
          type: 'flagged',
          title: 'Entity Flagged',
          description: 'Flagged for suspicious financial activity',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          user: 'Agent Smith',
        },
        {
          id: 't2',
          type: 'linked',
          title: 'Linked to Case',
          description: 'Added to Operation Phoenix investigation',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          user: 'Agent Johnson',
        },
        {
          id: 't3',
          type: 'updated',
          title: 'Profile Updated',
          description: 'Contact information updated',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          user: 'System',
        },
      ];
    },
  });

  if (!entity) return null;

  const getRiskColor = (risk: Entity['risk']) => {
    switch (risk) {
      case 'critical':
        return theme.colors.error;
      case 'high':
        return theme.colors.warning;
      case 'medium':
        return '#FF9800';
      case 'low':
        return theme.colors.success;
    }
  };

  const getTimelineIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created':
        return 'plus-circle';
      case 'updated':
        return 'pencil';
      case 'linked':
        return 'link-variant';
      case 'flagged':
        return 'flag';
      case 'note':
        return 'note-text';
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Avatar
          name={entity.name}
          size={80}
          imageUrl={entity.imageUrl}
          style={styles.avatar}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.entityName}>{entity.name}</Text>
          <View style={styles.headerMeta}>
            <Chip label={entity.type} size="small" />
            <StatusIndicator status={entity.status} label={entity.status} />
            <View style={[styles.riskBadge, {backgroundColor: getRiskColor(entity.risk) + '20'}]}>
              <Icon name="alert" size={12} color={getRiskColor(entity.risk)} />
              <Text style={[styles.riskText, {color: getRiskColor(entity.risk)}]}>
                {entity.risk.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{entity.linkedCases}</Text>
          <Text style={styles.statLabel}>Cases</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{entity.relationships}</Text>
          <Text style={styles.statLabel}>Links</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{entity.documents}</Text>
          <Text style={styles.statLabel}>Docs</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="message" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="phone" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="email" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="share" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabs}>
      {(['overview', 'relationships', 'timeline', 'documents'] as TabType[]).map(tab => (
        <TouchableOpacity
          key={tab}
          onPress={() => setActiveTab(tab)}
          style={[styles.tab, activeTab === tab && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverview = () => (
    <View>
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{entity.description}</Text>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        {entity.email && (
          <View style={styles.infoRow}>
            <Icon name="email" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>{entity.email}</Text>
          </View>
        )}
        {entity.phone && (
          <View style={styles.infoRow}>
            <Icon name="phone" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>{entity.phone}</Text>
          </View>
        )}
        {entity.address && (
          <View style={styles.infoRow}>
            <Icon name="map-marker" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>{entity.address}</Text>
          </View>
        )}
      </Card>

      {entity.type === 'person' && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          {entity.dateOfBirth && (
            <View style={styles.infoRow}>
              <Icon name="cake" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.infoText}>{formatDate(entity.dateOfBirth, 'MMMM d, yyyy')}</Text>
            </View>
          )}
          {entity.nationality && (
            <View style={styles.infoRow}>
              <Icon name="flag" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.infoText}>{entity.nationality}</Text>
            </View>
          )}
        </Card>
      )}

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Tags</Text>
        <View style={styles.tags}>
          {entity.tags.map((tag, index) => (
            <Chip key={index} label={tag} size="small" />
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Metadata</Text>
        <View style={styles.infoRow}>
          <Icon name="clock-outline" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>
            Created {formatRelativeTime(entity.createdAt)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="update" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>
            Updated {formatRelativeTime(entity.updatedAt)}
          </Text>
        </View>
      </Card>
    </View>
  );

  const renderRelationships = () => (
    <View>
      {relationships?.map(rel => (
        <Card key={rel.id} style={styles.section}>
          <View style={styles.relationshipHeader}>
            <View style={styles.relationshipInfo}>
              <Text style={styles.relationshipName}>{rel.targetName}</Text>
              <Text style={styles.relationshipType}>{rel.relationshipType}</Text>
            </View>
            <View style={styles.relationshipStrength}>
              <Text style={styles.strengthValue}>{Math.round(rel.strength * 100)}%</Text>
            </View>
          </View>
          <Text style={styles.relationshipSince}>
            Since {formatDate(rel.since, 'MMM yyyy')}
          </Text>
        </Card>
      ))}
    </View>
  );

  const renderTimeline = () => (
    <View>
      {timeline?.map((event, index) => (
        <View key={event.id} style={styles.timelineItem}>
          <View style={styles.timelineLine}>
            {index < timeline.length - 1 && <View style={styles.timelineConnector} />}
          </View>
          <View style={styles.timelineIcon}>
            <Icon name={getTimelineIcon(event.type)} size={16} color={theme.colors.primary} />
          </View>
          <View style={styles.timelineContent}>
            <Card style={styles.timelineCard}>
              <Text style={styles.timelineTitle}>{event.title}</Text>
              <Text style={styles.timelineDescription}>{event.description}</Text>
              <View style={styles.timelineMeta}>
                <Text style={styles.timelineTime}>
                  {formatRelativeTime(event.timestamp)}
                </Text>
                {event.user && (
                  <Text style={styles.timelineUser}>by {event.user}</Text>
                )}
              </View>
            </Card>
          </View>
        </View>
      ))}
    </View>
  );

  const renderDocuments = () => (
    <View>
      <Card style={styles.section}>
        <Text style={styles.emptyText}>Documents feature coming soon</Text>
      </Card>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderTabs()}
        <View style={styles.content}>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'relationships' && renderRelationships()}
          {activeTab === 'timeline' && renderTimeline()}
          {activeTab === 'documents' && renderDocuments()}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: theme.colors.surface,
    padding: spacing.lg,
    ...shadows.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    marginRight: spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  entityName: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  headerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: theme.borderRadius.sm,
    gap: spacing.xs,
  },
  riskText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.bold,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.regular,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.medium,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontFamily: typography.fonts.semibold,
  },
  content: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semibold,
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: typography.sizes.md,
    color: theme.colors.text,
    fontFamily: typography.fonts.regular,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: typography.sizes.md,
    color: theme.colors.text,
    fontFamily: typography.fonts.regular,
    marginLeft: spacing.sm,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  relationshipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  relationshipInfo: {
    flex: 1,
  },
  relationshipName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semibold,
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  relationshipType: {
    fontSize: typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.regular,
  },
  relationshipStrength: {
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  strengthValue: {
    fontSize: typography.sizes.sm,
    color: theme.colors.primary,
    fontFamily: typography.fonts.semibold,
  },
  relationshipSince: {
    fontSize: typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.regular,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineLine: {
    width: 40,
    alignItems: 'center',
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.border,
    marginTop: spacing.xs,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  timelineCard: {
    padding: spacing.md,
  },
  timelineTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.semibold,
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  timelineDescription: {
    fontSize: typography.sizes.sm,
    color: theme.colors.text,
    fontFamily: typography.fonts.regular,
    marginBottom: spacing.sm,
  },
  timelineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineTime: {
    fontSize: typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.regular,
  },
  timelineUser: {
    fontSize: typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.regular,
    marginLeft: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.regular,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
