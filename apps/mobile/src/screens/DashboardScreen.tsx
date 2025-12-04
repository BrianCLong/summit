import React, { useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Bell,
  Search,
  FileText,
  Users,
  AlertTriangle,
  TrendingUp,
  Activity,
  MapPin,
} from 'lucide-react-native';

import { useDashboardStats, useAlerts } from '@/graphql/hooks';
import { useAppStore } from '@/stores/appStore';
import {
  Text,
  Card,
  CardHeader,
  CardContent,
  Badge,
  PriorityBadge,
  Avatar,
  Skeleton,
  SkeletonCard,
} from '@/components/ui';
import { cn } from '@/utils/cn';

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { stats, loading, refetch } = useDashboardStats();
  const { alerts } = useAlerts({ first: 5 });
  const { user, syncStatus, offlineMode } = useAppStore();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const quickStats = [
    {
      label: 'Entities',
      value: stats?.totalEntities || 0,
      icon: Users,
      color: 'text-intel-400',
      bgColor: 'bg-intel-600/20',
    },
    {
      label: 'Investigations',
      value: stats?.totalInvestigations || 0,
      icon: FileText,
      color: 'text-purple-400',
      bgColor: 'bg-purple-600/20',
    },
    {
      label: 'Active Alerts',
      value: stats?.activeAlerts || 0,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-600/20',
    },
    {
      label: 'Pending Tasks',
      value: stats?.pendingTasks || 0,
      icon: Activity,
      color: 'text-green-400',
      bgColor: 'bg-green-600/20',
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center">
          <Avatar
            src={user?.avatar}
            fallback={user?.name}
            size="default"
            online={!offlineMode}
          />
          <View className="ml-3">
            <Text size="sm" variant="muted">
              Welcome back,
            </Text>
            <Text size="lg" weight="semibold">
              {user?.name || 'Analyst'}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => navigation.navigate('Search')}
            className="w-10 h-10 rounded-full bg-dark-elevated items-center justify-center"
          >
            <Search size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            className="w-10 h-10 rounded-full bg-dark-elevated items-center justify-center relative"
          >
            <Bell size={20} color="#fff" />
            {(stats?.activeAlerts || 0) > 0 && (
              <View className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full items-center justify-center">
                <Text size="xs" weight="bold">
                  {stats?.activeAlerts > 9 ? '9+' : stats?.activeAlerts}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline Banner */}
      {offlineMode && (
        <View className="bg-amber-600/20 border-b border-amber-600/50 px-4 py-2">
          <Text size="sm" className="text-amber-400 text-center">
            You're offline. Changes will sync when connected.
          </Text>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-6"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0ea5e9"
          />
        }
      >
        {/* Quick Stats */}
        <View className="flex-row flex-wrap mt-4 -mx-1">
          {loading
            ? [1, 2, 3, 4].map((i) => (
                <View key={i} className="w-1/2 px-1 mb-2">
                  <Skeleton className="h-24 rounded-xl" />
                </View>
              ))
            : quickStats.map((stat, index) => (
                <View key={index} className="w-1/2 px-1 mb-2">
                  <Card className="h-24">
                    <CardContent className="flex-1 justify-between py-3">
                      <View className={cn('w-8 h-8 rounded-lg items-center justify-center', stat.bgColor)}>
                        <stat.icon size={18} color={stat.color.replace('text-', '#').replace('-400', '')} />
                      </View>
                      <View>
                        <Text size="2xl" weight="bold">
                          {stat.value.toLocaleString()}
                        </Text>
                        <Text size="xs" variant="muted">
                          {stat.label}
                        </Text>
                      </View>
                    </CardContent>
                  </Card>
                </View>
              ))}
        </View>

        {/* Recent Alerts */}
        <View className="mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text size="lg" weight="semibold">
              Recent Alerts
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
              <Text size="sm" variant="primary">
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <SkeletonCard />
          ) : alerts.length === 0 ? (
            <Card>
              <CardContent className="items-center py-8">
                <AlertTriangle size={32} color="#71717a" />
                <Text variant="muted" className="mt-2">
                  No active alerts
                </Text>
              </CardContent>
            </Card>
          ) : (
            <Card>
              {alerts.map((alert, index) => (
                <TouchableOpacity
                  key={alert.id}
                  onPress={() => navigation.navigate('AlertDetails', { alertId: alert.id })}
                  className={cn(
                    'p-4',
                    index < alerts.length - 1 && 'border-b border-dark-border',
                  )}
                >
                  <View className="flex-row items-start">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 mb-1">
                        <PriorityBadge priority={alert.priority} />
                        {!alert.isRead && (
                          <View className="w-2 h-2 bg-intel-500 rounded-full" />
                        )}
                      </View>
                      <Text weight="medium" numberOfLines={1}>
                        {alert.title}
                      </Text>
                      <Text size="sm" variant="muted" numberOfLines={2} className="mt-1">
                        {alert.description}
                      </Text>
                      <View className="flex-row items-center mt-2 gap-3">
                        <Text size="xs" variant="muted">
                          {alert.source}
                        </Text>
                        {alert.location && (
                          <View className="flex-row items-center">
                            <MapPin size={12} color="#71717a" />
                            <Text size="xs" variant="muted" className="ml-1">
                              {alert.location.name || 'Location'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </Card>
          )}
        </View>

        {/* Entity Breakdown */}
        {stats?.entityBreakdown && stats.entityBreakdown.length > 0 && (
          <View className="mt-6">
            <Text size="lg" weight="semibold" className="mb-3">
              Entity Distribution
            </Text>
            <Card>
              <CardContent>
                {stats.entityBreakdown.slice(0, 5).map((item: any, index: number) => (
                  <View
                    key={item.type}
                    className={cn(
                      'flex-row items-center justify-between py-3',
                      index < Math.min(stats.entityBreakdown.length, 5) - 1 &&
                        'border-b border-dark-border',
                    )}
                  >
                    <Text>{item.type}</Text>
                    <View className="flex-row items-center gap-3">
                      <View className="w-24 h-2 bg-dark-elevated rounded-full overflow-hidden">
                        <View
                          style={{
                            width: `${(item.count / stats.totalEntities) * 100}%`,
                          }}
                          className="h-full bg-intel-500 rounded-full"
                        />
                      </View>
                      <Text size="sm" variant="muted" className="w-12 text-right">
                        {item.count}
                      </Text>
                    </View>
                  </View>
                ))}
              </CardContent>
            </Card>
          </View>
        )}

        {/* Sync Status */}
        {syncStatus.pendingChanges > 0 && (
          <View className="mt-6">
            <Card className="bg-intel-600/10 border-intel-600/30">
              <CardContent className="flex-row items-center">
                <Activity size={20} color="#0ea5e9" />
                <View className="ml-3 flex-1">
                  <Text size="sm">
                    {syncStatus.pendingChanges} changes pending sync
                  </Text>
                  {syncStatus.lastSyncAt && (
                    <Text size="xs" variant="muted">
                      Last synced: {new Date(syncStatus.lastSyncAt).toLocaleTimeString()}
                    </Text>
                  )}
                </View>
              </CardContent>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
