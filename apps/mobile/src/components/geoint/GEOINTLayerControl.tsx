import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Layers, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react-native';

import { useMapStore } from '@/stores/mapStore';
import { useGEOINTLayers } from '@/graphql/hooks';
import { cn } from '@/utils/cn';

interface GEOINTLayerControlProps {
  className?: string;
}

export const GEOINTLayerControl: React.FC<GEOINTLayerControlProps> = ({
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { visibleLayers, toggleLayer, layerOpacity, setLayerOpacity } = useMapStore();
  const { layers, loading } = useGEOINTLayers();

  const animatedStyle = useAnimatedStyle(() => ({
    height: withSpring(isExpanded ? 300 : 48, {
      damping: 15,
      stiffness: 150,
    }),
  }));

  const layerTypeIcons: Record<string, string> = {
    entities: 'Users',
    alerts: 'Bell',
    heatmap: 'Flame',
    routes: 'Route',
    areas: 'Square',
    custom: 'Star',
  };

  return (
    <Animated.View
      style={animatedStyle}
      className={cn(
        'absolute right-4 top-4 bg-dark-surface rounded-xl border border-dark-border overflow-hidden w-64',
        className,
      )}
    >
      {/* Header */}
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center justify-between p-3 border-b border-dark-border"
      >
        <View className="flex-row items-center">
          <Layers size={18} color="#fff" />
          <Text className="text-white font-medium ml-2">Layers</Text>
        </View>
        {isExpanded ? (
          <ChevronUp size={18} color="#71717a" />
        ) : (
          <ChevronDown size={18} color="#71717a" />
        )}
      </TouchableOpacity>

      {/* Layer list */}
      {isExpanded && (
        <ScrollView className="flex-1 p-2">
          {layers.map((layer) => {
            const isVisible = visibleLayers.includes(layer.id);
            const opacity = layerOpacity[layer.id] ?? layer.opacity;

            return (
              <View key={layer.id} className="mb-2">
                <TouchableOpacity
                  onPress={() => toggleLayer(layer.id)}
                  className="flex-row items-center justify-between p-2 rounded-lg bg-dark-elevated"
                >
                  <View className="flex-row items-center flex-1">
                    {isVisible ? (
                      <Eye size={16} color="#0ea5e9" />
                    ) : (
                      <EyeOff size={16} color="#71717a" />
                    )}
                    <Text
                      className={cn(
                        'ml-2 text-sm',
                        isVisible ? 'text-white' : 'text-dark-muted',
                      )}
                    >
                      {layer.name}
                    </Text>
                  </View>
                  <Text className="text-xs text-dark-muted">
                    {layer.featureCount || 0}
                  </Text>
                </TouchableOpacity>

                {/* Opacity slider */}
                {isVisible && (
                  <View className="flex-row items-center mt-1 px-2">
                    <Text className="text-xs text-dark-muted w-12">Opacity</Text>
                    <View className="flex-1 h-1 bg-dark-elevated rounded-full mx-2">
                      <View
                        style={{ width: `${opacity * 100}%` }}
                        className="h-full bg-intel-500 rounded-full"
                      />
                    </View>
                    <Text className="text-xs text-dark-muted w-8 text-right">
                      {Math.round(opacity * 100)}%
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

          {layers.length === 0 && !loading && (
            <Text className="text-dark-muted text-center py-4 text-sm">
              No layers available
            </Text>
          )}
        </ScrollView>
      )}
    </Animated.View>
  );
};
