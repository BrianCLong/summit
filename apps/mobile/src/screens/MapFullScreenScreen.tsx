import React, { useEffect } from 'react';
import { View, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { X, Layers, Target, ZoomIn, ZoomOut } from 'lucide-react-native';

import type { RootStackParamList } from '@/types';
import { GEOINTMap } from '@/components/geoint';
import { useMapStore } from '@/stores/mapStore';
import { Text, Button } from '@/components/ui';

type MapFullScreenRouteProp = RouteProp<RootStackParamList, 'MapFullScreen'>;

export const MapFullScreenScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<MapFullScreenRouteProp>();
  const { setCenterCoordinates, setSelectedLayers } = useMapStore();

  const { layerIds, centerOn } = route.params || {};

  useEffect(() => {
    if (centerOn) {
      setCenterCoordinates(centerOn.lat, centerOn.lng);
    }
    if (layerIds) {
      setSelectedLayers(layerIds);
    }
  }, [centerOn, layerIds, setCenterCoordinates, setSelectedLayers]);

  return (
    <View className="flex-1 bg-dark-bg">
      <StatusBar barStyle="light-content" />

      {/* Full Screen Map */}
      <GEOINTMap
        onFeaturePress={(feature) => {
          if (feature.properties.entityId) {
            navigation.navigate('EntityDetails' as never, {
              entityId: feature.properties.entityId,
            } as never);
          }
        }}
        showControls={true}
        showLayers={true}
        fullScreen={true}
      />

      {/* Floating Close Button */}
      <View className="absolute top-12 left-4 z-10">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-dark-surface/90 border border-dark-border items-center justify-center"
          accessibilityLabel="Close full screen map"
          accessibilityRole="button"
        >
          <X size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Floating Controls */}
      <View className="absolute top-12 right-4 z-10 gap-2">
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-dark-surface/90 border border-dark-border items-center justify-center"
          accessibilityLabel="Toggle layers"
          accessibilityRole="button"
        >
          <Layers size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-dark-surface/90 border border-dark-border items-center justify-center"
          accessibilityLabel="Center on location"
          accessibilityRole="button"
        >
          <Target size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Zoom Controls */}
      <View className="absolute bottom-24 right-4 z-10 gap-2">
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-dark-surface/90 border border-dark-border items-center justify-center"
          accessibilityLabel="Zoom in"
          accessibilityRole="button"
        >
          <ZoomIn size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-dark-surface/90 border border-dark-border items-center justify-center"
          accessibilityLabel="Zoom out"
          accessibilityRole="button"
        >
          <ZoomOut size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Location Info Bar */}
      {centerOn && (
        <View className="absolute bottom-8 left-4 right-4 z-10">
          <View className="bg-dark-surface/90 rounded-xl border border-dark-border px-4 py-3">
            <View className="flex-row items-center justify-between">
              <View>
                <Text size="sm" variant="muted">
                  Centered on
                </Text>
                <Text weight="medium">
                  {centerOn.lat.toFixed(4)}, {centerOn.lng.toFixed(4)}
                </Text>
              </View>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => navigation.goBack()}
              >
                Return
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};
