import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, Button } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Camera, CameraType } from 'expo-camera';
import { useSync } from '../services/SyncProvider';

// Documents are now stored in the encrypted offline store queue as 'document-scan' events,
// and we maintain a local cache of metadata. In a real app, we'd query a dedicated SQLite table.
// For this prototype, we'll just demonstrate the scanning flow.

type SecureDocument = {
  id: string;
  title: string;
  path: string;
  scannedAt: number;
};

export default function DocumentsScreen(): JSX.Element {
  const [documents, setDocuments] = useState<SecureDocument[]>([]);
  const [scanning, setScanning] = useState(false);
  const cameraRef = useRef<Camera | null>(null);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const { enqueue } = useSync();

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission, requestPermission]);

  const handleScan = async () => {
    if (!cameraRef.current) return;
    const snapshot = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: true });

    // Simulate OCR processing: In production, use 'react-native-mlkit-ocr'
    const text = "CONFIDENTIAL\nINTEL REPORT...";

    const docId = `doc-${Date.now()}`;
    const filename = `${FileSystem.documentDirectory}${docId}.jpg`;
    await FileSystem.moveAsync({ from: snapshot.uri, to: filename });

    const newDoc: SecureDocument = {
      id: docId,
      title: `Field Scan ${new Date().toLocaleTimeString()}`,
      path: filename,
      scannedAt: Date.now()
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
    Alert.alert('Document Secured', 'Scan completed, OCR extracted, and encrypted into local database.');
  };

  const handleOpen = async (doc: SecureDocument) => {
    enqueue({ type: 'document-open', id: doc.id, openedAt: Date.now() });
    Alert.alert('Secure Viewer', `Accessing encrypted document: ${doc.title}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Secure Documents</Text>
        <Button title="+ Scan" onPress={() => setScanning(true)} />
      </View>

      <FlatList
        data={documents}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => handleOpen(item)}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.metadata}>Scanned: {new Date(item.scannedAt).toLocaleDateString()}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No secure documents in this session.</Text>}
      />

      <Modal visible={scanning} animationType="slide">
        <View style={styles.scanContainer}>
          <Text style={styles.scanTitle}>Align Document</Text>
          <Camera ref={cameraRef} style={styles.camera} type={CameraType.back}>
            <View style={styles.guideFrame} />
          </Camera>
          <View style={styles.scanControls}>
            <Button title="Cancel" onPress={() => setScanning(false)} color="red" />
            <Button title="Capture & Process" onPress={handleScan} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
