import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import {
  Plus,
  Minus,
  Navigation,
  Map,
  Satellite,
  Moon,
  Sun,
} from 'lucide-react-native';

import { cn } from '@/utils/cn';

type MapStyleType = 'satellite' | 'streets' | 'dark' | 'light';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  mapStyle: MapStyleType;
  onStyleChange: (style: MapStyleType) => void;
  className?: string;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onRecenter,
  mapStyle,
  onStyleChange,
  className,
}) => {
  const [showStylePicker, setShowStylePicker] = useState(false);

  const styles: { key: MapStyleType; icon: React.ReactNode; label: string }[] = [
    { key: 'satellite', icon: <Satellite size={18} color="#fff" />, label: 'Satellite' },
    { key: 'streets', icon: <Map size={18} color="#fff" />, label: 'Streets' },
    { key: 'dark', icon: <Moon size={18} color="#fff" />, label: 'Dark' },
    { key: 'light', icon: <Sun size={18} color="#fff" />, label: 'Light' },
  ];

  const currentStyle = styles.find((s) => s.key === mapStyle);

  return (
    <View className={cn('absolute left-4 bottom-24', className)}>
      {/* Zoom controls */}
      <View className="bg-dark-surface rounded-xl border border-dark-border overflow-hidden mb-3">
        <TouchableOpacity
          onPress={onZoomIn}
          className="p-3 border-b border-dark-border active:bg-dark-elevated"
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onZoomOut}
          className="p-3 active:bg-dark-elevated"
        >
          <Minus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Recenter button */}
      <TouchableOpacity
        onPress={onRecenter}
        className="bg-dark-surface rounded-xl border border-dark-border p-3 mb-3 active:bg-dark-elevated"
      >
        <Navigation size={20} color="#0ea5e9" />
      </TouchableOpacity>

      {/* Map style picker */}
      <View className="relative">
        {showStylePicker && (
          <View className="absolute bottom-14 left-0 bg-dark-surface rounded-xl border border-dark-border overflow-hidden w-32">
            {styles.map((style) => (
              <TouchableOpacity
                key={style.key}
                onPress={() => {
                  onStyleChange(style.key);
                  setShowStylePicker(false);
                }}
                className={cn(
                  'flex-row items-center p-3 border-b border-dark-border',
                  style.key === mapStyle && 'bg-intel-600/20',
                )}
              >
                {style.icon}
                <Text
                  className={cn(
                    'ml-2 text-sm',
                    style.key === mapStyle ? 'text-intel-400' : 'text-white',
                  )}
                >
                  {style.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={() => setShowStylePicker(!showStylePicker)}
          className="bg-dark-surface rounded-xl border border-dark-border p-3 active:bg-dark-elevated"
        >
          {currentStyle?.icon}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Compass component
export const MapCompass: React.FC<{ bearing: number; onPress: () => void }> = ({
  bearing,
  onPress,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="absolute right-4 bottom-24 bg-dark-surface rounded-full border border-dark-border w-12 h-12 items-center justify-center"
      style={{ transform: [{ rotate: `${-bearing}deg` }] }}
    >
      <View className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-red-500" />
      <View className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-white mt-0.5" />
    </TouchableOpacity>
  );
};

// Scale bar component
export const MapScaleBar: React.FC<{ metersPerPixel: number }> = ({
  metersPerPixel,
}) => {
  // Calculate a nice round number for the scale bar
  const targetWidth = 100; // pixels
  const targetDistance = metersPerPixel * targetWidth;

  let distance: number;
  let unit: string;

  if (targetDistance >= 1000) {
    distance = Math.round(targetDistance / 1000);
    unit = 'km';
  } else {
    distance = Math.round(targetDistance / 100) * 100;
    unit = 'm';
  }

  const actualWidth = distance / metersPerPixel * (unit === 'km' ? 1000 : 1);

  return (
    <View className="absolute left-4 bottom-4 items-start">
      <View
        style={{ width: actualWidth }}
        className="h-1 bg-white border border-dark-bg"
      />
      <Text className="text-xs text-white mt-1 font-medium">
        {distance} {unit}
      </Text>
    </View>
  );
};
