import React, {useState, useRef} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView} from 'react-native';
import MapView, {Marker, Circle, PROVIDER_GOOGLE} from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {theme, spacing, typography, shadows} from '../theme';
import {Card, Chip} from '../components/UIComponents';
import {useLocation} from '../contexts/LocationContext';

interface EntityMarker {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  type: 'person' | 'organization' | 'event' | 'location';
  status: 'active' | 'inactive' | 'flagged';
}

interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  color: string;
}

const mockEntities: EntityMarker[] = [
  {
    id: '1',
    title: 'John Smith',
    description: 'Last seen 2 hours ago',
    latitude: 37.78825,
    longitude: -122.4324,
    type: 'person',
    status: 'active',
  },
  {
    id: '2',
    title: 'Acme Corporation HQ',
    description: 'Organization headquarters',
    latitude: 37.7933,
    longitude: -122.4367,
    type: 'organization',
    status: 'flagged',
  },
  {
    id: '3',
    title: 'Meeting Location',
    description: 'Suspicious activity reported',
    latitude: 37.7849,
    longitude: -122.4294,
    type: 'event',
    status: 'active',
  },
];

const mockGeofences: Geofence[] = [
  {
    id: 'g1',
    name: 'High Risk Zone',
    latitude: 37.78825,
    longitude: -122.4324,
    radius: 500,
    color: 'rgba(244, 67, 54, 0.3)',
  },
  {
    id: 'g2',
    name: 'Watch Area',
    latitude: 37.7933,
    longitude: -122.4367,
    radius: 300,
    color: 'rgba(255, 152, 0, 0.3)',
  },
];

export const MapScreen: React.FC = () => {
  const mapRef = useRef<MapView>(null);
  const {currentLocation} = useLocation();
  const [selectedMarker, setSelectedMarker] = useState<EntityMarker | null>(null);
  const [showGeofences, setShowGeofences] = useState(true);
  const [filterType, setFilterType] = useState<'all' | EntityMarker['type']>('all');

  const filteredEntities =
    filterType === 'all'
      ? mockEntities
      : mockEntities.filter(e => e.type === filterType);

  const getMarkerColor = (entity: EntityMarker) => {
    switch (entity.status) {
      case 'active':
        return theme.colors.success;
      case 'flagged':
        return theme.colors.error;
      case 'inactive':
        return theme.colors.textSecondary;
    }
  };

  const getMarkerIcon = (type: EntityMarker['type']) => {
    switch (type) {
      case 'person':
        return 'account';
      case 'organization':
        return 'office-building';
      case 'event':
        return 'calendar-alert';
      case 'location':
        return 'map-marker';
    }
  };

  const handleMarkerPress = (entity: EntityMarker) => {
    setSelectedMarker(entity);
  };

  const handleMyLocationPress = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  };

  const handleFitAllMarkers = () => {
    if (mapRef.current && filteredEntities.length > 0) {
      mapRef.current.fitToCoordinates(
        filteredEntities.map(e => ({
          latitude: e.latitude,
          longitude: e.longitude,
        })),
        {
          edgePadding: {top: 100, right: 50, bottom: 200, left: 50},
          animated: true,
        }
      );
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
        showsScale>
        {filteredEntities.map(entity => (
          <Marker
            key={entity.id}
            coordinate={{
              latitude: entity.latitude,
              longitude: entity.longitude,
            }}
            onPress={() => handleMarkerPress(entity)}
            pinColor={getMarkerColor(entity)}>
            <View
              style={[
                styles.customMarker,
                {backgroundColor: getMarkerColor(entity)},
              ]}>
              <Icon name={getMarkerIcon(entity.type)} size={20} color="#fff" />
            </View>
          </Marker>
        ))}

        {showGeofences &&
          mockGeofences.map(geofence => (
            <Circle
              key={geofence.id}
              center={{
                latitude: geofence.latitude,
                longitude: geofence.longitude,
              }}
              radius={geofence.radius}
              fillColor={geofence.color}
              strokeColor={geofence.color.replace('0.3', '0.8')}
              strokeWidth={2}
            />
          ))}
      </MapView>

      <View style={styles.topControls}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}>
          <TouchableOpacity
            onPress={() => setFilterType('all')}
            style={[
              styles.filterChip,
              filterType === 'all' && styles.filterChipActive,
            ]}>
            <Icon
              name="apps"
              size={16}
              color={
                filterType === 'all'
                  ? theme.colors.primary
                  : theme.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.filterChipText,
                filterType === 'all' && styles.filterChipTextActive,
              ]}>
              All ({mockEntities.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilterType('person')}
            style={[
              styles.filterChip,
              filterType === 'person' && styles.filterChipActive,
            ]}>
            <Icon
              name="account"
              size={16}
              color={
                filterType === 'person'
                  ? theme.colors.primary
                  : theme.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.filterChipText,
                filterType === 'person' && styles.filterChipTextActive,
              ]}>
              People
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilterType('organization')}
            style={[
              styles.filterChip,
              filterType === 'organization' && styles.filterChipActive,
            ]}>
            <Icon
              name="office-building"
              size={16}
              color={
                filterType === 'organization'
                  ? theme.colors.primary
                  : theme.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.filterChipText,
                filterType === 'organization' && styles.filterChipTextActive,
              ]}>
              Orgs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilterType('event')}
            style={[
              styles.filterChip,
              filterType === 'event' && styles.filterChipActive,
            ]}>
            <Icon
              name="calendar-alert"
              size={16}
              color={
                filterType === 'event'
                  ? theme.colors.primary
                  : theme.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.filterChipText,
                filterType === 'event' && styles.filterChipTextActive,
              ]}>
              Events
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.rightControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setShowGeofences(!showGeofences)}>
          <Icon
            name={showGeofences ? 'shield-check' : 'shield-off-outline'}
            size={24}
            color={
              showGeofences ? theme.colors.primary : theme.colors.textSecondary
            }
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleFitAllMarkers}>
          <Icon name="fit-to-screen" size={24} color={theme.colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleMyLocationPress}>
          <Icon name="crosshairs-gps" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {selectedMarker && (
        <View style={styles.bottomSheet}>
          <Card>
            <View style={styles.markerDetailHeader}>
              <View style={styles.markerDetailTitleRow}>
                <View
                  style={[
                    styles.markerDetailIcon,
                    {backgroundColor: getMarkerColor(selectedMarker) + '20'},
                  ]}>
                  <Icon
                    name={getMarkerIcon(selectedMarker.type)}
                    size={24}
                    color={getMarkerColor(selectedMarker)}
                  />
                </View>
                <View style={styles.markerDetailInfo}>
                  <Text style={styles.markerDetailTitle}>
                    {selectedMarker.title}
                  </Text>
                  <Text style={styles.markerDetailDescription}>
                    {selectedMarker.description}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedMarker(null)}>
                  <Icon
                    name="close"
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.markerDetailActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Icon name="directions" size={20} color={theme.colors.primary} />
                <Text style={styles.actionButtonText}>Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Icon name="information" size={20} color={theme.colors.primary} />
                <Text style={styles.actionButtonText}>Details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Icon name="share" size={20} color={theme.colors.primary} />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      )}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, {backgroundColor: theme.colors.success}]} />
          <Text style={styles.legendText}>Active</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, {backgroundColor: theme.colors.error}]} />
          <Text style={styles.legendText}>Flagged</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, {backgroundColor: theme.colors.textSecondary}]} />
          <Text style={styles.legendText}>Inactive</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  topControls: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
  },
  filtersContent: {
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    ...shadows.md,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary + '15',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    marginLeft: spacing.xs,
    fontSize: typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.medium,
  },
  filterChipTextActive: {
    color: theme.colors.primary,
  },
  rightControls: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.xl,
    gap: spacing.sm,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  customMarker: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...shadows.lg,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  markerDetailHeader: {
    marginBottom: spacing.md,
  },
  markerDetailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markerDetailIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  markerDetailInfo: {
    flex: 1,
  },
  markerDetailTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.semibold,
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  markerDetailDescription: {
    fontSize: typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.regular,
  },
  markerDetailActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  actionButtonText: {
    fontSize: typography.sizes.xs,
    color: theme.colors.primary,
    fontFamily: typography.fonts.medium,
    marginTop: spacing.xs,
  },
  legend: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    gap: spacing.md,
    ...shadows.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: theme.borderRadius.full,
  },
  legendText: {
    fontSize: typography.sizes.xs,
    color: theme.colors.text,
    fontFamily: typography.fonts.regular,
  },
});
