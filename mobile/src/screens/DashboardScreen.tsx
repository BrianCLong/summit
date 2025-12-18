import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { Marker } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import { useNavigation } from '@react-navigation/native';
import { useSync } from '../services/SyncProvider';

const sampleIntel = [
  { id: '1', title: 'Site Alpha', latitude: 37.7749, longitude: -122.4194 },
  { id: '2', title: 'Site Beta', latitude: 37.7849, longitude: -122.4094 },
  { id: '3', title: 'Supply Depot', latitude: 34.0522, longitude: -118.2437 },
  { id: '4', title: 'Logistics', latitude: 40.7128, longitude: -74.006 },
  { id: '5', title: 'Analyst', latitude: 47.6062, longitude: -122.3321 }
];

export default function DashboardScreen(): JSX.Element {
  const navigation = useNavigation();
  const { lastSync, queueSize, status, lastError, syncNow } = useSync();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Summit Intelligence</Text>
          <Text style={styles.subtitle}>Operational picture with offline protection</Text>
        </View>
        <Button title="Sync" onPress={syncNow} color="#5AC8FA" />
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Queue</Text>
        <Text style={styles.statusValue}>{queueSize}</Text>
        <Text style={styles.statusLabel}>State</Text>
        <Text style={styles.statusValue}>{status}</Text>
        <Text style={styles.statusLabel}>Last Sync</Text>
        <Text style={styles.statusValue}>{lastSync ? lastSync.toLocaleTimeString() : '—'}</Text>
      </View>
      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}

      <View style={styles.mapWrapper}>
        <ClusteredMapView
          style={styles.map}
          initialRegion={{ latitude: 37.7749, longitude: -122.4194, latitudeDelta: 15, longitudeDelta: 15 }}
        >
          {sampleIntel.map(point => (
            <Marker coordinate={{ latitude: point.latitude, longitude: point.longitude }} key={point.id} title={point.title} />
          ))}
        </ClusteredMapView>
      </View>

      <View style={styles.actions}>
        <Button title="Capture" onPress={() => navigation.navigate('Capture' as never)} />
        <Button title="Documents" onPress={() => navigation.navigate('Documents' as never)} />
        <Button title="Voice" onPress={() => navigation.navigate('Voice' as never)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0B1221' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { color: 'white', fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#9FB3D1' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  statusLabel: { color: '#9FB3D1', fontWeight: '600' },
  statusValue: { color: '#FFFFFF' },
  error: { color: '#FF6B6B', marginBottom: 8 },
  mapWrapper: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1F2A44', marginBottom: 12 },
  map: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }
});
