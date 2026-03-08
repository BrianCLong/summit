"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CaptureScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const expo_camera_1 = require("expo-camera");
const FileSystem = __importStar(require("expo-file-system"));
const Location = __importStar(require("expo-location"));
const SyncProvider_1 = require("../services/SyncProvider");
function CaptureScreen() {
    const cameraRef = (0, react_1.useRef)(null);
    const [permission, requestPermission] = expo_camera_1.Camera.useCameraPermissions();
    const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
    const [photoUri, setPhotoUri] = (0, react_1.useState)();
    const [processing, setProcessing] = (0, react_1.useState)(false);
    const { enqueue, queueSize } = (0, SyncProvider_1.useSync)();
    (0, react_1.useEffect)(() => {
        if (!permission?.granted)
            requestPermission();
        if (!locationPermission?.granted)
            requestLocationPermission();
    }, [permission, locationPermission, requestPermission, requestLocationPermission]);
    const handleCapture = async () => {
        if (!cameraRef.current)
            return;
        setProcessing(true);
        try {
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const snapshot = await cameraRef.current.takePictureAsync({ quality: 0.6, base64: true });
            // Use GPS timestamp if available, fallback to Date.now() only if necessary
            const timestamp = location.timestamp || Date.now();
            const filename = `${FileSystem.documentDirectory}intel-${timestamp}.jpg`;
            await FileSystem.moveAsync({ from: snapshot.uri, to: filename });
            setPhotoUri(filename);
            await enqueue({
                type: 'image',
                payload: filename,
                capturedAt: timestamp,
                location: {
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                    accuracy: location.coords.accuracy,
                    altitude: location.coords.altitude
                },
                deviceIntegrity: true // Placeholder for integrity check
            });
            react_native_1.Alert.alert('Secure Capture', 'Intelligence tagged with GPS timestamp, encrypted and queued.');
        }
        catch (e) {
            react_native_1.Alert.alert('Error', e.message);
        }
        finally {
            setProcessing(false);
        }
    };
    return (<react_native_1.View style={styles.container}>
      <react_native_1.Text style={styles.title}>Capture Field Intelligence</react_native_1.Text>
      <react_native_1.Text style={styles.subtitle}>Geo-tagged, encrypted evidence collection</react_native_1.Text>
      <react_native_1.View style={styles.cameraFrame}>
        <expo_camera_1.Camera ref={cameraRef} style={styles.camera} type={expo_camera_1.CameraType.back}/>
        {processing && (<react_native_1.View style={styles.overlay}>
            <react_native_1.ActivityIndicator size="large" color="#5AC8FA"/>
            <react_native_1.Text style={styles.overlayText}>Encrypting...</react_native_1.Text>
          </react_native_1.View>)}
      </react_native_1.View>
      <react_native_1.View style={styles.controls}>
        <react_native_1.Button title={permission?.granted ? 'Capture Evidence' : 'Request Permissions'} onPress={handleCapture} disabled={processing}/>
      </react_native_1.View>
      <react_native_1.Text style={styles.queue}>Encrypted Queue Depth: {queueSize}</react_native_1.Text>
      {photoUri ? <react_native_1.Image source={{ uri: photoUri }} style={styles.preview}/> : null}
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#0B1221' },
    title: { color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 4 },
    subtitle: { color: '#9FB3D1', marginBottom: 12 },
    cameraFrame: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1F2A44', marginBottom: 12, position: 'relative' },
    camera: { flex: 1 },
    overlay: { ...react_native_1.StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    overlayText: { color: 'white', marginTop: 8 },
    controls: { marginBottom: 8 },
    preview: { marginTop: 12, height: 100, borderRadius: 8 },
    queue: { marginTop: 8, color: '#9FB3D1', textAlign: 'center' }
});
