import React, { useCallback } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import {
  ArrowLeft,
  MapPin,
  Clock,
  ExternalLink,
  CheckCircle,
  Share,
  Link2,
} from 'lucide-react-native';
import { formatDistanceToNow, format } from 'date-fns';

import type { RootStackParamList } from '@/types';
import { useAlert, useAcknowledgeAlert } from '@/graphql/hooks';
import {
  Text,
  Card,
  CardContent,
  Badge,
  PriorityBadge,
  Button,
  Skeleton,
} from '@/components/ui';

type AlertDetailsRouteProp = RouteProp<RootStackParamList, 'AlertDetails'>;

export const AlertDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<AlertDetailsRouteProp>();
  const { alertId } = route.params;

  const { alert, loading, error } = useAlert(alertId);
  const { acknowledgeAlert, loading: acknowledging } = useAcknowledgeAlert();

  const handleAcknowledge = useCallback(async () => {
    await acknowledgeAlert(alertId);
  }, [acknowledgeAlert, alertId]);

  const handleViewOnMap = useCallback(() => {
    if (alert?.location) {
      navigation.navigate('MapFullScreen', {
        centerOn: {
          lat: alert.location.latitude,
          lng: alert.location.longitude,
        },
      });
    }
  }, [navigation, alert]);

  const handleViewSource = useCallback(() => {
    if (alert?.sourceUrl) {
      // Open external URL
    }
  }, [alert]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-dark-bg">
        <View className="flex-row items-center px-4 py-3 border-b border-dark-border">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Skeleton className="ml-4 h-6 w-32" />
        </View>
        <View className="p-4">
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-24 w-full mb-4" />
          <Skeleton className="h-16 w-full" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !alert) {
    return (
      <SafeAreaView className="flex-1 bg-dark-bg">
        <View className="flex-row items-center px-4 py-3 border-b border-dark-border">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text weight="semibold" className="ml-4">
            Alert Details
          </Text>
        </View>
        <View className="flex-1 items-center justify-center p-4">
          <Text variant="muted">Unable to load alert details</Text>
          <Button
            variant="secondary"
            className="mt-4"
            onPress={() => navigation.goBack()}
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-dark-border">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text weight="semibold" className="ml-4">
            Alert Details
          </Text>
        </View>
        <TouchableOpacity>
          <Share size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Priority and Status */}
        <View className="flex-row items-center justify-between mb-4">
          <PriorityBadge priority={alert.priority} size="lg" />
          <View className="flex-row items-center gap-2">
            {alert.isAcknowledged && (
              <Badge variant="success">
                <CheckCircle size={12} color="#22c55e" />
                <Text size="xs" className="ml-1">
                  Acknowledged
                </Text>
              </Badge>
            )}
          </View>
        </View>

        {/* Title */}
        <Text size="xl" weight="bold" className="mb-2">
          {alert.title}
        </Text>

        {/* Source */}
        <View className="flex-row items-center mb-4">
          <Text size="sm" variant="muted">
            Source: {alert.source}
          </Text>
          {alert.sourceUrl && (
            <TouchableOpacity onPress={handleViewSource} className="ml-2">
              <ExternalLink size={14} color="#0ea5e9" />
            </TouchableOpacity>
          )}
        </View>

        {/* Description */}
        <Card className="mb-4">
          <CardContent>
            <Text>{alert.description}</Text>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card className="mb-4">
          <CardContent>
            <View className="gap-3">
              {/* Timestamp */}
              <View className="flex-row items-center">
                <Clock size={16} color="#71717a" />
                <View className="ml-3">
                  <Text size="sm" variant="muted">
                    Detected
                  </Text>
                  <Text>
                    {format(new Date(alert.timestamp), 'MMM d, yyyy h:mm a')}
                  </Text>
                  <Text size="xs" variant="muted">
                    ({formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })})
                  </Text>
                </View>
              </View>

              {/* Location */}
              {alert.location && (
                <View className="flex-row items-center">
                  <MapPin size={16} color="#71717a" />
                  <View className="ml-3 flex-1">
                    <Text size="sm" variant="muted">
                      Location
                    </Text>
                    <Text>
                      {alert.location.name || `${alert.location.latitude.toFixed(4)}, ${alert.location.longitude.toFixed(4)}`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleViewOnMap}>
                    <Text size="sm" className="text-intel-400">
                      View on Map
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Acknowledgment */}
              {alert.isAcknowledged && alert.acknowledgedAt && (
                <View className="flex-row items-center">
                  <CheckCircle size={16} color="#22c55e" />
                  <View className="ml-3">
                    <Text size="sm" variant="muted">
                      Acknowledged by {alert.acknowledgedBy || 'Unknown'}
                    </Text>
                    <Text size="xs" variant="muted">
                      {format(new Date(alert.acknowledgedAt), 'MMM d, yyyy h:mm a')}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </CardContent>
        </Card>

        {/* Related Entities */}
        {alert.entities && alert.entities.length > 0 && (
          <Card className="mb-4">
            <CardContent>
              <Text weight="medium" className="mb-3">
                Related Entities ({alert.entities.length})
              </Text>
              <View className="gap-2">
                {alert.entities.slice(0, 5).map((entityId) => (
                  <TouchableOpacity
                    key={entityId}
                    onPress={() => navigation.navigate('EntityDetails', { entityId })}
                    className="flex-row items-center justify-between py-2 border-b border-dark-border"
                  >
                    <View className="flex-row items-center">
                      <Link2 size={14} color="#71717a" />
                      <Text size="sm" className="ml-2">
                        {entityId.slice(0, 8)}...
                      </Text>
                    </View>
                    <Text size="xs" className="text-intel-400">
                      View
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </CardContent>
          </Card>
        )}
      </ScrollView>

      {/* Action Footer */}
      {!alert.isAcknowledged && (
        <View className="px-4 py-4 border-t border-dark-border">
          <Button
            onPress={handleAcknowledge}
            loading={acknowledging}
            className="w-full"
          >
            Acknowledge Alert
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
};
