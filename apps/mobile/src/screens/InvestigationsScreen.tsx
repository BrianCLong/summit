import React, { useCallback, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Plus,
  Filter,
  FileText,
  Users,
  Calendar,
  Link2,
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

import { useInvestigations } from '@/graphql/hooks';
import type { Investigation } from '@/types';
import {
  Text,
  Card,
  CardContent,
  Badge,
  PriorityBadge,
  ClassificationBadge,
  Button,
  Avatar,
  AvatarGroup,
  SkeletonCard,
} from '@/components/ui';
import { cn } from '@/utils/cn';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-slate-600/20', text: 'text-slate-400' },
  ACTIVE: { bg: 'bg-green-600/20', text: 'text-green-400' },
  ON_HOLD: { bg: 'bg-amber-600/20', text: 'text-amber-400' },
  CLOSED: { bg: 'bg-dark-muted/20', text: 'text-dark-muted' },
  ARCHIVED: { bg: 'bg-dark-muted/20', text: 'text-dark-muted' },
};

export const InvestigationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const { investigations, loading, hasNextPage, loadMore, refetch } = useInvestigations({
    filter: statusFilter ? { status: statusFilter } : undefined,
    first: 20,
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderInvestigation = useCallback(
    ({ item: investigation }: { item: Investigation }) => {
      const statusStyle = STATUS_COLORS[investigation.status] || STATUS_COLORS.DRAFT;

      return (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('InvestigationDetails', {
              investigationId: investigation.id,
            })
          }
          activeOpacity={0.7}
          className="mb-3"
        >
          <Card>
            <CardContent>
              {/* Header */}
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <ClassificationBadge classification={investigation.classification} />
                  <View className={cn('px-2 py-0.5 rounded', statusStyle.bg)}>
                    <Text size="xs" className={statusStyle.text}>
                      {investigation.status}
                    </Text>
                  </View>
                </View>
                <PriorityBadge priority={investigation.priority} />
              </View>

              {/* Title & Description */}
              <Text size="lg" weight="semibold" numberOfLines={2}>
                {investigation.title}
              </Text>
              {investigation.description && (
                <Text size="sm" variant="muted" numberOfLines={2} className="mt-1">
                  {investigation.description}
                </Text>
              )}

              {/* Stats */}
              <View className="flex-row items-center gap-4 mt-4">
                <View className="flex-row items-center">
                  <Users size={14} color="#71717a" />
                  <Text size="sm" variant="muted" className="ml-1">
                    {investigation.entityCount} entities
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Link2 size={14} color="#71717a" />
                  <Text size="sm" variant="muted" className="ml-1">
                    {investigation.relationshipCount} relationships
                  </Text>
                </View>
              </View>

              {/* Footer */}
              <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-dark-border">
                <View className="flex-row items-center">
                  {investigation.team && investigation.team.length > 0 ? (
                    <AvatarGroup
                      avatars={investigation.team.map((member) => ({
                        fallback: member,
                      }))}
                      max={3}
                      size="sm"
                    />
                  ) : (
                    <Avatar fallback={investigation.leadAnalyst} size="sm" />
                  )}
                  <Text size="xs" variant="muted" className="ml-2">
                    {investigation.leadAnalyst}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <Calendar size={12} color="#71717a" />
                  <Text size="xs" variant="muted" className="ml-1">
                    {formatDistanceToNow(new Date(investigation.updatedAt), {
                      addSuffix: true,
                    })}
                  </Text>
                </View>
              </View>

              {/* Due date warning */}
              {investigation.dueDate && (
                <View
                  className={cn(
                    'mt-3 px-3 py-2 rounded-lg',
                    new Date(investigation.dueDate) < new Date()
                      ? 'bg-red-600/20'
                      : 'bg-amber-600/10',
                  )}
                >
                  <Text
                    size="xs"
                    className={
                      new Date(investigation.dueDate) < new Date()
                        ? 'text-red-400'
                        : 'text-amber-400'
                    }
                  >
                    Due: {new Date(investigation.dueDate).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>
        </TouchableOpacity>
      );
    },
    [navigation],
  );

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center py-20">
      <FileText size={48} color="#71717a" />
      <Text size="lg" weight="medium" className="mt-4">
        No investigations
      </Text>
      <Text variant="muted" className="mt-1 text-center px-8">
        Create your first investigation to get started
      </Text>
      <Button className="mt-6" leftIcon={<Plus size={16} color="#fff" />}>
        New Investigation
      </Button>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-dark-border">
        <Text size="xl" weight="bold">
          Investigations
        </Text>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity className="w-10 h-10 rounded-full bg-dark-elevated items-center justify-center">
            <Filter size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity className="w-10 h-10 rounded-full bg-intel-600 items-center justify-center">
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status filter tabs */}
      <View className="flex-row px-4 py-3 border-b border-dark-border">
        {['All', 'ACTIVE', 'DRAFT', 'ON_HOLD', 'CLOSED'].map((status) => (
          <TouchableOpacity
            key={status}
            onPress={() => setStatusFilter(status === 'All' ? undefined : status)}
            className={cn(
              'px-4 py-2 rounded-full mr-2',
              (status === 'All' && !statusFilter) || statusFilter === status
                ? 'bg-intel-600'
                : 'bg-dark-elevated',
            )}
          >
            <Text size="sm">
              {status === 'All' ? 'All' : status.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Investigation list */}
      <FlatList
        data={investigations}
        renderItem={renderInvestigation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={loading ? null : renderEmpty}
        ListFooterComponent={
          loading ? (
            <View>
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} className="mb-3" />
              ))}
            </View>
          ) : null
        }
        onEndReached={hasNextPage ? loadMore : undefined}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0ea5e9"
          />
        }
      />
    </SafeAreaView>
  );
};
