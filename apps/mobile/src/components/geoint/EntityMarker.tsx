import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  User,
  Building2,
  MapPin,
  Calendar,
  FileText,
  AlertTriangle,
  Car,
  Smartphone,
  Wallet,
  MessageCircle,
} from 'lucide-react-native';

import type { Entity, EntityType } from '@/types';
import { cn } from '@/utils/cn';

interface EntityMarkerProps {
  entity: Entity;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const entityIcons: Record<EntityType, React.FC<{ size: number; color: string }>> = {
  PERSON: User,
  ORGANIZATION: Building2,
  LOCATION: MapPin,
  EVENT: Calendar,
  DOCUMENT: FileText,
  THREAT: AlertTriangle,
  VEHICLE: Car,
  DEVICE: Smartphone,
  FINANCIAL: Wallet,
  COMMUNICATION: MessageCircle,
};

const entityColors: Record<EntityType, string> = {
  PERSON: '#8b5cf6',
  ORGANIZATION: '#06b6d4',
  LOCATION: '#10b981',
  EVENT: '#f97316',
  DOCUMENT: '#6366f1',
  THREAT: '#ef4444',
  VEHICLE: '#64748b',
  DEVICE: '#0891b2',
  FINANCIAL: '#059669',
  COMMUNICATION: '#4f46e5',
};

const sizes = {
  sm: { container: 28, icon: 14 },
  md: { container: 36, icon: 18 },
  lg: { container: 44, icon: 22 },
};

export const EntityMarker: React.FC<EntityMarkerProps> = ({
  entity,
  selected = false,
  onPress,
  size = 'md',
}) => {
  const Icon = entityIcons[entity.type] || MapPin;
  const color = entityColors[entity.type] || '#6366f1';
  const { container: containerSize, icon: iconSize } = sizes[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="items-center"
    >
      <View
        style={{
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
          backgroundColor: color,
          borderWidth: selected ? 3 : 2,
          borderColor: selected ? '#fff' : 'rgba(255,255,255,0.5)',
        }}
        className="items-center justify-center shadow-lg"
      >
        <Icon size={iconSize} color="#fff" />
      </View>

      {/* Priority indicator */}
      {entity.priority === 'CRITICAL' && (
        <View
          className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white"
        />
      )}

      {/* Label (shown when selected) */}
      {selected && (
        <View className="mt-1 px-2 py-0.5 bg-dark-elevated rounded-full max-w-[100px]">
          <Text className="text-xs text-white text-center" numberOfLines={1}>
            {entity.name}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Mini marker for dense areas
export const EntityMarkerMini: React.FC<{ type: EntityType; count?: number }> = ({
  type,
  count,
}) => {
  const color = entityColors[type] || '#6366f1';

  return (
    <View
      style={{ backgroundColor: color }}
      className="w-4 h-4 rounded-full border border-white items-center justify-center"
    >
      {count && count > 1 && (
        <Text className="text-[8px] text-white font-bold">{count}</Text>
      )}
    </View>
  );
};
