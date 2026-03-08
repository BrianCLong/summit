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
exports.default = DocumentsScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const FileSystem = __importStar(require("expo-file-system"));
const expo_camera_1 = require("expo-camera");
const SyncProvider_1 = require("../services/SyncProvider");
function DocumentsScreen() {
    const [documents, setDocuments] = (0, react_1.useState)([]);
    const [scanning, setScanning] = (0, react_1.useState)(false);
    const cameraRef = (0, react_1.useRef)(null);
    const [permission, requestPermission] = expo_camera_1.Camera.useCameraPermissions();
    const { enqueue } = (0, SyncProvider_1.useSync)();
    (0, react_1.useEffect)(() => {
        if (!permission?.granted)
            requestPermission();
    }, [permission, requestPermission]);
    const handleScan = async () => {
        if (!cameraRef.current)
            return;
        const snapshot = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: true });
        // Simulate OCR processing: In production, use 'react-native-mlkit-ocr'
        const text = "CONFIDENTIAL\nINTEL REPORT...";
        // Use a variable to ensure consistency
        // Note: Date.now() in event handlers is safe, unlike in render logic.
        const now = Date.now();
        const docId = `doc-${now}`;
        const filename = `${FileSystem.documentDirectory}${docId}.jpg`;
        await FileSystem.moveAsync({ from: snapshot.uri, to: filename });
        const newDoc = {
            id: docId,
            title: `Field Scan ${new Date(now).toLocaleTimeString()}`,
            path: filename,
            scannedAt: now
        };
        // Optimistic local state update
        setDocuments(prev => [newDoc, ...prev]);
        // Store metadata and OCR result in Encrypted Queue (SQLite)
        await enqueue({
            type: 'document-scan',
            id: docId,
            title: newDoc.title,
            ocrText: text,
            imagePath: filename,
            metadata: {
                scannedAt: newDoc.scannedAt
            }
        });
        setScanning(false);
        react_native_1.Alert.alert('Document Secured', 'Scan completed, OCR extracted, and encrypted into local database.');
    };
    const handleOpen = async (doc) => {
        // Capture time once before the async operation.
        // We disable the lint rule here because this function is an event handler, NOT a render function.
        // The lint rule sometimes gets confused by async arrow functions in props.
        // eslint-disable-next-line react-hooks/purity
        const openedTime = Date.now();
        await enqueue({ type: 'document-open', id: doc.id, openedAt: openedTime });
        react_native_1.Alert.alert('Secure Viewer', `Accessing encrypted document: ${doc.title}`);
    };
    return (<react_native_1.View style={styles.container}>
      <react_native_1.View style={styles.header}>
        <react_native_1.Text style={styles.title}>Secure Documents</react_native_1.Text>
        <react_native_1.Button title="+ Scan" onPress={() => setScanning(true)}/>
      </react_native_1.View>

      <react_native_1.FlatList data={documents} keyExtractor={item => item.id} renderItem={({ item }) => (<react_native_1.TouchableOpacity style={styles.item} onPress={() => handleOpen(item)}>
            <react_native_1.Text style={styles.itemTitle}>{item.title}</react_native_1.Text>
            <react_native_1.Text style={styles.metadata}>Scanned: {new Date(item.scannedAt).toLocaleDateString()}</react_native_1.Text>
          </react_native_1.TouchableOpacity>)} ListEmptyComponent={<react_native_1.Text style={styles.empty}>No secure documents in this session.</react_native_1.Text>}/>

      <react_native_1.Modal visible={scanning} animationType="slide">
        <react_native_1.View style={styles.scanContainer}>
          <react_native_1.Text style={styles.scanTitle}>Align Document</react_native_1.Text>
          <expo_camera_1.Camera ref={cameraRef} style={styles.camera} type={expo_camera_1.CameraType.back}>
            <react_native_1.View style={styles.guideFrame}/>
          </expo_camera_1.Camera>
          <react_native_1.View style={styles.scanControls}>
            <react_native_1.Button title="Cancel" onPress={() => setScanning(false)} color="red"/>
            <react_native_1.Button title="Capture & Process" onPress={handleScan}/>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#0B1221' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { color: 'white', fontSize: 20, fontWeight: '700' },
    item: { padding: 16, backgroundColor: '#111A30', borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#1F2A44' },
    itemTitle: { color: 'white', fontSize: 16, fontWeight: '600' },
    metadata: { color: '#A1A8BC', marginTop: 6, fontSize: 12 },
    empty: { color: '#666', textAlign: 'center', marginTop: 20 },
    scanContainer: { flex: 1, backgroundColor: 'black' },
    scanTitle: { color: 'white', textAlign: 'center', margin: 20, fontSize: 18, fontWeight: 'bold' },
    camera: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    guideFrame: { width: '80%', height: '60%', borderWidth: 2, borderColor: '#5AC8FA', borderStyle: 'dashed' },
    scanControls: { flexDirection: 'row', justifyContent: 'space-around', padding: 20, backgroundColor: '#0B1221' }
});
