import React, { useCallback, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Maximize2,
  Filter,
  Layers,
  Target,
} from 'lucide-react-native';

import { GEOINTMap } from '@/components/geoint';
import { useEntity } from '@/graphql/hooks';
import { useMapStore } from '@/stores/mapStore';
import type { GEOINTFeature, Entity } from '@/types';
import {
  Text,
  Card,
  CardContent,
  Badge,
  EntityTypeBadge,
  BottomSheet,
  Button,
} from '@/components/ui';
import { cn } from '@/utils/cn';

export const MapScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [selectedFeature, setSelectedFeature] = useState<GEOINTFeature | null>(null);
  const { selectedEntityId, setSelectedEntity } = useMapStore();

  const { entity: selectedEntity } = useEntity(selectedEntityId || '');

  const handleFeaturePress = useCallback((feature: GEOINTFeature) => {
    setSelectedFeature(feature);
    if (feature.properties.entityId) {
      setSelectedEntity(feature.properties.entityId);
    }
  }, [setSelectedEntity]);

  const handleFullScreen = useCallback(() => {
    navigation.navigate('MapFullScreen');
  }, [navigation]);

  const handleEntityDetails = useCallback(() => {
    if (selectedFeature?.properties.entityId) {
      navigation.navigate('EntityDetails', {
        entityId: selectedFeature.properties.entityId,
      });
    }
  }, [navigation, selectedFeature]);

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
      {/* Header */}
      <View className="absolute top-0 left-0 right-0 z-10 px-4 pt-12">
        <View className="flex-row items-center justify-between">
          <View className="bg-dark-surface/90 rounded-xl border border-dark-border px-4 py-2">
            <Text size="lg" weight="semibold">
              GEOINT Map
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-dark-surface/90 border border-dark-border items-center justify-center"
            >
              <Filter size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleFullScreen}
              className="w-10 h-10 rounded-full bg-dark-surface/90 border border-dark-border items-center justify-center"
            >
              <Maximize2 size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Map */}
      <GEOINTMap
        onFeaturePress={handleFeaturePress}
        showControls={true}
        showLayers={true}
      />

      {/* Feature Details Bottom Sheet */}
      <BottomSheet
        open={!!selectedFeature}
        onClose={() => {
          setSelectedFeature(null);
          setSelectedEntity(null);
        }}
        snapPoints={[0.35, 0.6]}
      >
        {selectedFeature && (
          <View className="py-2">
            {/* Feature header */}
            <View className="flex-row items-center justify-between mb-4">
              {selectedFeature.properties.entityType && (
                <EntityTypeBadge type={selectedFeature.properties.entityType} />
              )}
              {selectedFeature.properties.confidence !== undefined && (
                <Badge variant="secondary">
                  {selectedFeature.properties.confidence}% confidence
                </Badge>
              )}
            </View>

            {/* Feature name */}
            <Text size="xl" weight="bold">
              {selectedFeature.properties.name || 'Unknown Location'}
            </Text>

            {/* Description */}
            {selectedFeature.properties.description && (
              <Text variant="muted" className="mt-2">
                {selectedFeature.properties.description}
              </Text>
            )}

            {/* Coordinates */}
            {selectedFeature.geometry.type === 'Point' && (
              <View className="flex-row items-center mt-4 gap-4">
                <View className="flex-row items-center">
                  <Target size={14} color="#71717a" />
                  <Text size="sm" variant="muted" className="ml-1">
                    {(selectedFeature.geometry.coordinates as [number, number])[1].toFixed(6)},{' '}
                    {(selectedFeature.geometry.coordinates as [number, number])[0].toFixed(6)}
                  </Text>
                </View>
              </View>
            )}

            {/* Source and timestamp */}
            <View className="flex-row items-center mt-2 gap-4">
              {selectedFeature.properties.source && (
                <Text size="xs" variant="muted">
                  Source: {selectedFeature.properties.source}
                </Text>
              )}
              {selectedFeature.properties.timestamp && (
                <Text size="xs" variant="muted">
                  {new Date(selectedFeature.properties.timestamp).toLocaleString()}
                </Text>
              )}
            </View>

            {/* Actions */}
            <View className="flex-row mt-6 gap-3">
              {selectedFeature.properties.entityId && (
                <Button
                  className="flex-1"
                  onPress={handleEntityDetails}
                >
                  View Entity Details
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1"
                onPress={() => {
                  // Copy coordinates
                }}
              >
                Copy Coordinates
              </Button>
            </View>
          </View>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
};
