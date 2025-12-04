import React, { useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  ArrowLeft,
  Share2,
  MoreVertical,
  MapPin,
  Link2,
  Calendar,
  Shield,
  Tag,
  ExternalLink,
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

import { useEntity } from '@/graphql/hooks';
import type { RootStackParamList } from '@/types';
import {
  Text,
  Card,
  CardHeader,
  CardContent,
  Badge,
  EntityTypeBadge,
  ClassificationBadge,
  PriorityBadge,
  Button,
  Avatar,
  Separator,
  ProgressBar,
  Accordion,
  SkeletonCard,
} from '@/components/ui';
import { cn } from '@/utils/cn';

type EntityDetailsRouteProp = RouteProp<RootStackParamList, 'EntityDetails'>;

export const EntityDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<EntityDetailsRouteProp>();
  const { entityId } = route.params;

  const { entity, loading, error } = useEntity(entityId);

  const handleShare = useCallback(async () => {
    if (!entity) return;
    try {
      await Share.share({
        message: `Entity: ${entity.name}\nType: ${entity.type}\nClassification: ${entity.classification}`,
        title: entity.name,
      });
    } catch (err) {
      console.error('Share failed:', err);
    }
  }, [entity]);

  const handleViewOnMap = useCallback(() => {
    if (entity?.location) {
      navigation.navigate('MapFullScreen' as never, {
        centerOn: {
          lat: entity.location.latitude,
          lng: entity.location.longitude,
        },
      } as never);
    }
  }, [entity, navigation]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-dark-bg">
        <View className="px-4 py-3">
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !entity) {
    return (
      <SafeAreaView className="flex-1 bg-dark-bg items-center justify-center">
        <Text variant="muted">Entity not found</Text>
        <Button variant="outline" className="mt-4" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-dark-border">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-dark-elevated items-center justify-center"
        >
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={handleShare}
            className="w-10 h-10 rounded-full bg-dark-elevated items-center justify-center"
          >
            <Share2 size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity className="w-10 h-10 rounded-full bg-dark-elevated items-center justify-center">
            <MoreVertical size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 py-4">
        {/* Entity Header Card */}
        <Card>
          <CardContent>
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-2">
                  <EntityTypeBadge type={entity.type} />
                  <ClassificationBadge classification={entity.classification} />
                </View>
                <Text size="2xl" weight="bold">
                  {entity.name}
                </Text>
                {entity.description && (
                  <Text variant="muted" className="mt-2">
                    {entity.description}
                  </Text>
                )}
              </View>
            </View>

            {/* Confidence Score */}
            <View className="mt-4">
              <View className="flex-row items-center justify-between mb-1">
                <Text size="sm" variant="muted">
                  Confidence Score
                </Text>
                <Text size="sm" weight="semibold">
                  {entity.confidence}%
                </Text>
              </View>
              <ProgressBar
                value={entity.confidence}
                variant={
                  entity.confidence >= 80
                    ? 'success'
                    : entity.confidence >= 50
                    ? 'warning'
                    : 'destructive'
                }
              />
            </View>

            {/* Priority */}
            {entity.priority && (
              <View className="flex-row items-center mt-4">
                <Shield size={16} color="#71717a" />
                <Text size="sm" variant="muted" className="ml-2">
                  Priority:
                </Text>
                <PriorityBadge priority={entity.priority} className="ml-2" />
              </View>
            )}
          </CardContent>
        </Card>

        {/* Location */}
        {entity.location && (
          <Card className="mt-4">
            <CardHeader>
              <View className="flex-row items-center">
                <MapPin size={18} color="#0ea5e9" />
                <Text size="lg" weight="semibold" className="ml-2">
                  Location
                </Text>
              </View>
            </CardHeader>
            <CardContent>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text size="sm" variant="muted">
                    Coordinates
                  </Text>
                  <Text>
                    {entity.location.latitude.toFixed(6)}, {entity.location.longitude.toFixed(6)}
                  </Text>
                  {entity.location.accuracy && (
                    <Text size="xs" variant="muted">
                      Accuracy: {entity.location.accuracy}m
                    </Text>
                  )}
                </View>
                <Button variant="outline" size="sm" onPress={handleViewOnMap}>
                  View on Map
                </Button>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Relationships */}
        {entity.relationships && entity.relationships.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Link2 size={18} color="#0ea5e9" />
                  <Text size="lg" weight="semibold" className="ml-2">
                    Relationships
                  </Text>
                </View>
                <Badge>{entity.relationships.length}</Badge>
              </View>
            </CardHeader>
            <CardContent>
              {entity.relationships.slice(0, 5).map((rel: any, index: number) => (
                <TouchableOpacity
                  key={rel.id}
                  onPress={() =>
                    navigation.navigate('EntityDetails' as never, {
                      entityId: rel.targetId,
                    } as never)
                  }
                  className={cn(
                    'flex-row items-center justify-between py-3',
                    index < Math.min(entity.relationships!.length, 5) - 1 &&
                      'border-b border-dark-border',
                  )}
                >
                  <View className="flex-row items-center flex-1">
                    <Avatar fallback={rel.target?.name} size="sm" />
                    <View className="ml-3 flex-1">
                      <Text numberOfLines={1}>{rel.target?.name || 'Unknown'}</Text>
                      <Text size="xs" variant="muted">
                        {rel.type.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <Text size="xs" variant="muted">
                      {rel.confidence}%
                    </Text>
                    <ExternalLink size={14} color="#71717a" className="ml-2" />
                  </View>
                </TouchableOpacity>
              ))}
              {entity.relationships.length > 5 && (
                <Button variant="ghost" size="sm" className="mt-2">
                  View all {entity.relationships.length} relationships
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tags */}
        {entity.tags && entity.tags.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <View className="flex-row items-center">
                <Tag size={18} color="#0ea5e9" />
                <Text size="lg" weight="semibold" className="ml-2">
                  Tags
                </Text>
              </View>
            </CardHeader>
            <CardContent>
              <View className="flex-row flex-wrap gap-2">
                {entity.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </View>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        {entity.metadata && Object.keys(entity.metadata).length > 0 && (
          <Card className="mt-4">
            <Accordion
              items={[
                {
                  id: 'metadata',
                  title: 'Additional Metadata',
                  content: (
                    <View>
                      {Object.entries(entity.metadata).map(([key, value]) => (
                        <View
                          key={key}
                          className="flex-row justify-between py-2 border-b border-dark-border"
                        >
                          <Text size="sm" variant="muted">
                            {key}
                          </Text>
                          <Text size="sm">{String(value)}</Text>
                        </View>
                      ))}
                    </View>
                  ),
                },
              ]}
            />
          </Card>
        )}

        {/* Timestamps */}
        <View className="mt-6 mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Calendar size={14} color="#71717a" />
              <Text size="xs" variant="muted" className="ml-1">
                Created {formatDistanceToNow(new Date(entity.createdAt), { addSuffix: true })}
              </Text>
            </View>
            <Text size="xs" variant="muted">
              Updated {formatDistanceToNow(new Date(entity.updatedAt), { addSuffix: true })}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
