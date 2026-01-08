import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ToggleLeft, ToggleRight } from 'lucide-react-native';

import { cn } from '@/utils/cn';

interface ClusteringToggleProps {
  enabled: boolean;
  onToggle: () => void;
  featureFlagEnabled?: boolean;
}

export const ClusteringToggle: React.FC<ClusteringToggleProps> = ({
  enabled,
  onToggle,
  featureFlagEnabled = true,
}) => {
  if (!featureFlagEnabled) return null;

  return (
    <View className="bg-dark-surface rounded-xl border border-dark-border px-4 py-3 flex-row items-center justify-between">
      <View>
        <Text className="text-white font-semibold">Clustering</Text>
        <Text className="text-xs text-gray-400">Toggle dynamic clustering</Text>
      </View>
      <TouchableOpacity
        accessibilityLabel="Toggle clustering"
        onPress={onToggle}
        className={cn(
          'p-2 rounded-full border',
          enabled ? 'border-intel-400 bg-intel-600/20' : 'border-dark-border bg-dark-elevated',
        )}
      >
        {enabled ? (
          <ToggleRight size={24} color="#0ea5e9" />
        ) : (
          <ToggleLeft size={24} color="#94a3b8" />
        )}
      </TouchableOpacity>
    </View>
  );
};
