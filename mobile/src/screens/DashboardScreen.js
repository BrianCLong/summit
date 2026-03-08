"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardScreen;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const react_native_maps_1 = require("react-native-maps");
const react_native_map_clustering_1 = __importDefault(require("react-native-map-clustering"));
const native_1 = require("@react-navigation/native");
const SyncProvider_1 = require("../services/SyncProvider");
const sampleIntel = [
    { id: '1', title: 'Site Alpha', latitude: 37.7749, longitude: -122.4194 },
    { id: '2', title: 'Site Beta', latitude: 37.7849, longitude: -122.4094 },
    { id: '3', title: 'Supply Depot', latitude: 34.0522, longitude: -118.2437 },
    { id: '4', title: 'Logistics', latitude: 40.7128, longitude: -74.006 },
    { id: '5', title: 'Analyst', latitude: 47.6062, longitude: -122.3321 }
];
function DashboardScreen() {
    const navigation = (0, native_1.useNavigation)();
    const { lastSync, queueSize, status, lastError, syncNow, lowDataMode, setLowDataMode, enqueue } = (0, SyncProvider_1.useSync)();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleLongPress = async (e) => {
        const { coordinate } = e.nativeEvent;
        react_native_1.Alert.alert("Add Evidence Marker", `Tag location ${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Tag & Queue",
                onPress: async () => {
                    await enqueue({
                        type: 'marker',
                        lat: coordinate.latitude,
                        lng: coordinate.longitude,
                        createdAt: Date.now()
                    });
                }
            }
        ]);
    };
    return (<react_native_1.View style={styles.container}>
      <react_native_1.View style={styles.header}>
        <react_native_1.View>
          <react_native_1.Text style={styles.title}>Summit Intelligence</react_native_1.Text>
          <react_native_1.Text style={styles.subtitle}>Operational picture with offline protection</react_native_1.Text>
        </react_native_1.View>
        <react_native_1.Button title="Sync" onPress={syncNow} color="#5AC8FA"/>
      </react_native_1.View>

      <react_native_1.View style={styles.statusPanel}>
        <react_native_1.View style={styles.statusRow}>
          <react_native_1.Text style={styles.statusLabel}>Queue</react_native_1.Text>
          <react_native_1.Text style={styles.statusValue}>{queueSize}</react_native_1.Text>
          <react_native_1.Text style={styles.statusLabel}>State</react_native_1.Text>
          <react_native_1.Text style={styles.statusValue}>{status}</react_native_1.Text>
        </react_native_1.View>
        <react_native_1.View style={styles.statusRow}>
           <react_native_1.Text style={styles.statusLabel}>Low Data Mode</react_native_1.Text>
           <react_native_1.Switch value={lowDataMode} onValueChange={setLowDataMode} trackColor={{ false: '#767577', true: '#5AC8FA' }} thumbColor="#f4f3f4"/>
        </react_native_1.View>
        <react_native_1.View style={styles.statusRow}>
           <react_native_1.Text style={styles.statusLabel}>Last Sync</react_native_1.Text>
           <react_native_1.Text style={styles.statusValue}>{lastSync ? lastSync.toLocaleTimeString() : '—'}</react_native_1.Text>
        </react_native_1.View>
      </react_native_1.View>

      {lastError ? <react_native_1.Text style={styles.error}>{lastError}</react_native_1.Text> : null}

      <react_native_1.View style={styles.mapWrapper}>
        <react_native_map_clustering_1.default style={styles.map} initialRegion={{ latitude: 37.7749, longitude: -122.4194, latitudeDelta: 15, longitudeDelta: 15 }} onLongPress={handleLongPress}>
          {sampleIntel.map(point => (<react_native_maps_1.Marker coordinate={{ latitude: point.latitude, longitude: point.longitude }} key={point.id}>
              <react_native_maps_1.Callout>
                <react_native_1.Text>{point.title}</react_native_1.Text>
              </react_native_maps_1.Callout>
            </react_native_maps_1.Marker>))}
        </react_native_map_clustering_1.default>
        <react_native_1.View style={styles.mapOverlay}>
          <react_native_1.Text style={styles.mapHint}>Long-press to add intel</react_native_1.Text>
        </react_native_1.View>
      </react_native_1.View>

      <react_native_1.View style={styles.actions}>
        <react_native_1.Button title="Capture" onPress={() => navigation.navigate('Capture')}/>
        <react_native_1.Button title="Documents" onPress={() => navigation.navigate('Documents')}/>
        <react_native_1.Button title="Voice" onPress={() => navigation.navigate('Voice')}/>
      </react_native_1.View>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#0B1221' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    title: { color: 'white', fontSize: 20, fontWeight: '700' },
    subtitle: { color: '#9FB3D1' },
    statusPanel: { marginBottom: 12, backgroundColor: '#111A30', padding: 8, borderRadius: 8 },
    statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    statusLabel: { color: '#9FB3D1', fontWeight: '600' },
    statusValue: { color: '#FFFFFF' },
    error: { color: '#FF6B6B', marginBottom: 8 },
    mapWrapper: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1F2A44', marginBottom: 12, position: 'relative' },
    map: { flex: 1 },
    mapOverlay: { position: 'absolute', bottom: 10, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 4 },
    mapHint: { color: 'white', fontSize: 10 },
    actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }
});
