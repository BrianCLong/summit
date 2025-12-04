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
  Filter,
  Bell,
  MapPin,
  Clock,
  CheckCircle,
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

import { useAlerts, useAcknowledgeAlert, useMarkAlertRead } from '@/graphql/hooks';
import type { OSINTAlert, Priority } from '@/types';
import {
  Text,
  Card,
  CardContent,
  Badge,
  PriorityBadge,
  Button,
  Chip,
  ChipGroup,
  BottomSheet,
  SkeletonListItem,
} from '@/components/ui';
import { cn } from '@/utils/cn';

const PRIORITY_OPTIONS: Priority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

export const AlertsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [selectedPriority, setSelectedPriority] = useState<Priority | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const { alerts, loading, hasNextPage, loadMore, refetch } = useAlerts({
    priority: selectedPriority,
    first: 20,
  });

  const { acknowledgeAlert } = useAcknowledgeAlert();
  const { markAlertRead } = useMarkAlertRead();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleAlertPress = useCallback(
    async (alert: OSINTAlert) => {
      if (!alert.isRead) {
        await markAlertRead(alert.id);
      }
      navigation.navigate('AlertDetails', { alertId: alert.id });
    },
    [markAlertRead, navigation],
  );

  const handleAcknowledge = useCallback(
    async (alertId: string) => {
      await acknowledgeAlert(alertId);
    },
    [acknowledgeAlert],
  );

  const renderAlert = useCallback(
    ({ item: alert }: { item: OSINTAlert }) => (
      <TouchableOpacity
        onPress={() => handleAlertPress(alert)}
        activeOpacity={0.7}
        className="mb-3"
      >
        <Card className={cn(!alert.isRead && 'border-intel-600/50')}>
          <CardContent>
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-2">
                  <PriorityBadge priority={alert.priority} />
                  {!alert.isRead && (
                    <Badge variant="primary" size="sm">
                      NEW
                    </Badge>
                  )}
                  {alert.isAcknowledged && (
                    <CheckCircle size={14} color="#22c55e" />
                  )}
                </View>

                <Text weight="semibold" numberOfLines={2}>
                  {alert.title}
                </Text>

                <Text size="sm" variant="muted" numberOfLines={3} className="mt-1">
                  {alert.description}
                </Text>

                <View className="flex-row items-center mt-3 gap-4">
                  <View className="flex-row items-center">
                    <Clock size={12} color="#71717a" />
                    <Text size="xs" variant="muted" className="ml-1">
                      {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                    </Text>
                  </View>

                  {alert.location && (
                    <View className="flex-row items-center">
                      <MapPin size={12} color="#71717a" />
                      <Text size="xs" variant="muted" className="ml-1" numberOfLines={1}>
                        {alert.location.name || 'View on map'}
                      </Text>
                    </View>
                  )}

                  <Text size="xs" variant="muted">
                    {alert.source}
                  </Text>
                </View>
              </View>
            </View>

            {!alert.isAcknowledged && (
              <View className="flex-row mt-4 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => handleAcknowledge(alert.id)}
                  className="flex-1"
                >
                  Acknowledge
                </Button>
                {alert.location && (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() =>
                      navigation.navigate('MapFullScreen', {
                        centerOn: {
                          lat: alert.location!.latitude,
                          lng: alert.location!.longitude,
                        },
                      })
                    }
                    leftIcon={<MapPin size={14} color="#fff" />}
                  >
                    Map
                  </Button>
                )}
              </View>
            )}
          </CardContent>
        </Card>
      </TouchableOpacity>
    ),
    [handleAlertPress, handleAcknowledge, navigation],
  );

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center py-20">
      <Bell size={48} color="#71717a" />
      <Text size="lg" weight="medium" className="mt-4">
        No alerts
      </Text>
      <Text variant="muted" className="mt-1 text-center px-8">
        {selectedPriority
          ? `No ${selectedPriority.toLowerCase()} priority alerts found`
          : 'All clear! No active alerts at this time'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-dark-border">
        <Text size="xl" weight="bold">
          OSINT Alerts
        </Text>
        <TouchableOpacity
          onPress={() => setShowFilters(true)}
          className={cn(
            'flex-row items-center px-3 py-2 rounded-lg',
            selectedPriority ? 'bg-intel-600/20' : 'bg-dark-elevated',
          )}
        >
          <Filter size={16} color={selectedPriority ? '#0ea5e9' : '#fff'} />
          <Text size="sm" className={cn('ml-2', selectedPriority && 'text-intel-400')}>
            {selectedPriority || 'Filter'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active filter indicator */}
      {selectedPriority && (
        <View className="px-4 py-2 bg-dark-surface border-b border-dark-border">
          <View className="flex-row items-center">
            <Text size="sm" variant="muted">
              Filtering by:
            </Text>
            <Chip
              variant="primary"
              className="ml-2"
              onRemove={() => setSelectedPriority(undefined)}
            >
              {selectedPriority}
            </Chip>
          </View>
        </View>
      )}

      {/* Alert list */}
      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={loading ? null : renderEmpty}
        ListFooterComponent={
          loading ? (
            <View>
              {[1, 2, 3].map((i) => (
                <SkeletonListItem key={i} className="mb-3" />
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

      {/* Filter Bottom Sheet */}
      <BottomSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filter Alerts"
        snapPoints={[0.4]}
      >
        <View className="py-4">
          <Text weight="medium" className="mb-3">
            Priority Level
          </Text>
          <ChipGroup
            options={PRIORITY_OPTIONS}
            selected={selectedPriority ? [selectedPriority] : []}
            onSelectionChange={(selected) =>
              setSelectedPriority(selected[0] as Priority | undefined)
            }
          />

          <View className="flex-row mt-6 gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => {
                setSelectedPriority(undefined);
                setShowFilters(false);
              }}
            >
              Clear
            </Button>
            <Button
              className="flex-1"
              onPress={() => setShowFilters(false)}
            >
              Apply
            </Button>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
};
