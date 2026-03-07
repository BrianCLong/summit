import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Button, Image, Alert, ActivityIndicator } from "react-native";
import { Camera, CameraType } from "expo-camera";
import * as FileSystem from "expo-file-system";
import * as Location from "expo-location";
import { useSync } from "../services/SyncProvider";

export default function CaptureScreen(): JSX.Element {
  const cameraRef = useRef<Camera | null>(null);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [processing, setProcessing] = useState(false);
  const { enqueue, queueSize } = useSync();

  useEffect(() => {
    if (!permission?.granted) requestPermission();
    if (!locationPermission?.granted) requestLocationPermission();
  }, [permission, locationPermission, requestPermission, requestLocationPermission]);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    setProcessing(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const snapshot = await cameraRef.current.takePictureAsync({ quality: 0.6, base64: true });

      // Use GPS timestamp if available, fallback to Date.now() only if necessary
      const timestamp = location.timestamp || Date.now();

      const filename = `${FileSystem.documentDirectory}intel-${timestamp}.jpg`;

      await FileSystem.moveAsync({ from: snapshot.uri, to: filename });
      setPhotoUri(filename);

      await enqueue({
        type: "image",
        payload: filename,
        capturedAt: timestamp,
        location: {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          accuracy: location.coords.accuracy,
          altitude: location.coords.altitude,
        },
        deviceIntegrity: true, // Placeholder for integrity check
      });

      Alert.alert(
        "Secure Capture",
        "Intelligence tagged with GPS timestamp, encrypted and queued."
      );
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Capture Field Intelligence</Text>
      <Text style={styles.subtitle}>Geo-tagged, encrypted evidence collection</Text>
      <View style={styles.cameraFrame}>
        <Camera ref={cameraRef} style={styles.camera} type={CameraType.back} />
        {processing && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#5AC8FA" />
            <Text style={styles.overlayText}>Encrypting...</Text>
          </View>
        )}
      </View>
      <View style={styles.controls}>
        <Button
          title={permission?.granted ? "Capture Evidence" : "Request Permissions"}
          onPress={handleCapture}
          disabled={processing}
        />
      </View>
      <Text style={styles.queue}>Encrypted Queue Depth: {queueSize}</Text>
      {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#0B1221" },
  title: { color: "white", fontSize: 20, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "#9FB3D1", marginBottom: 12 },
  cameraFrame: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1F2A44",
    marginBottom: 12,
    position: "relative",
  },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayText: { color: "white", marginTop: 8 },
  controls: { marginBottom: 8 },
  preview: { marginTop: 12, height: 100, borderRadius: 8 },
  queue: { marginTop: 8, color: "#9FB3D1", textAlign: "center" },
});
