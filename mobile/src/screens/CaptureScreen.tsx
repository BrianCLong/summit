import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Button, Image, Alert } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { useSync } from '../services/SyncProvider';

export default function CaptureScreen(): JSX.Element {
  const cameraRef = useRef<Camera | null>(null);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const { enqueue, queueSize } = useSync();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    const snapshot = await cameraRef.current.takePictureAsync({ quality: 0.6, base64: true });
    const filename = `${FileSystem.documentDirectory}intel-${Date.now()}.jpg`;
    await FileSystem.moveAsync({ from: snapshot.uri, to: filename });
    setPhotoUri(filename);
    await enqueue({ type: 'image', payload: filename, capturedAt: Date.now() });
    Alert.alert('Staged for sync', 'Image stored locally and queued for delivery.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Capture Field Intelligence</Text>
      <Text style={styles.subtitle}>Offline-safe staging with secure file moves</Text>
      <View style={styles.cameraFrame}>
        <Camera ref={cameraRef} style={styles.camera} type={CameraType.back} />
      </View>
      <Button title={permission?.granted ? 'Capture' : 'Request permission'} onPress={handleCapture} />
      <Text style={styles.queue}>Queued items: {queueSize}</Text>
      {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0B1221' },
  title: { color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: '#9FB3D1', marginBottom: 12 },
  cameraFrame: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1F2A44', marginBottom: 12 },
  camera: { flex: 1 },
  preview: { marginTop: 12, height: 200, borderRadius: 8 },
  queue: { marginTop: 8, color: '#9FB3D1' }
});
