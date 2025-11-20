import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {Camera, useCameraDevice, useCameraPermission} from 'react-native-vision-camera';
import {launchImageLibrary} from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {theme, spacing, typography, shadows} from '../theme';
import {uploadMedia} from '../services/MediaUploadService';

const {width, height} = Dimensions.get('window');

export const CameraScreen: React.FC = () => {
  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const {hasPermission, requestPermission} = useCameraPermission();

  const [cameraType, setCameraType] = useState<'back' | 'front'>('back');
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleTakePhoto = async () => {
    if (!camera.current) return;

    try {
      setIsProcessing(true);
      const photo = await camera.current.takePhoto({
        flash: flashMode,
        qualityPrioritization: 'quality',
      });

      setCapturedPhoto(`file://${photo.path}`);
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 1,
        selectionLimit: 1,
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri) {
          setCapturedPhoto(asset.uri);
        }
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      Alert.alert('Error', 'Failed to select image from gallery.');
    }
  };

  const handleUploadPhoto = async () => {
    if (!capturedPhoto) return;

    try {
      setIsUploading(true);

      const fileName = `evidence_${Date.now()}.jpg`;
      await uploadMedia(capturedPhoto, {
        fileName,
        type: 'evidence',
        description: 'Field captured evidence',
      });

      Alert.alert(
        'Success',
        'Photo uploaded successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              setCapturedPhoto(null);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Error', 'Failed to upload photo. It will be queued for later.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
  };

  const toggleCameraType = () => {
    setCameraType(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlashMode = () => {
    setFlashMode(current => {
      switch (current) {
        case 'off':
          return 'on';
        case 'on':
          return 'auto';
        case 'auto':
          return 'off';
      }
    });
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case 'on':
        return 'flash';
      case 'off':
        return 'flash-off';
      case 'auto':
        return 'flash-auto';
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Icon name="camera-off" size={64} color={theme.colors.textSecondary} />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          This app needs camera access to capture evidence photos.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  // Preview mode - showing captured photo
  if (capturedPhoto) {
    return (
      <View style={styles.previewContainer}>
        <Image source={{uri: capturedPhoto}} style={styles.previewImage} />

        <View style={styles.previewHeader}>
          <TouchableOpacity onPress={handleRetakePhoto} style={styles.previewHeaderButton}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.previewHeaderTitle}>Photo Preview</Text>
          <View style={styles.previewHeaderButton} />
        </View>

        <View style={styles.previewActions}>
          <TouchableOpacity
            style={[styles.previewActionButton, styles.previewActionButtonSecondary]}
            onPress={handleRetakePhoto}>
            <Icon name="camera-retake" size={24} color={theme.colors.primary} />
            <Text style={styles.previewActionText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.previewActionButton, styles.previewActionButtonPrimary]}
            onPress={handleUploadPhoto}
            disabled={isUploading}>
            {isUploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="upload" size={24} color="#fff" />
                <Text style={styles.previewActionTextPrimary}>Upload</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Camera mode
  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={styles.camera}
        device={device}
        isActive={true}
        photo={true}
      />

      <View style={styles.overlay}>
        <View style={styles.topControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleFlashMode}>
            <Icon name={getFlashIcon()} size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.topControlsRight}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleCameraType}>
              <Icon name="camera-flip" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.frameGuide}>
          <View style={[styles.frameCorner, styles.frameCornerTopLeft]} />
          <View style={[styles.frameCorner, styles.frameCornerTopRight]} />
          <View style={[styles.frameCorner, styles.frameCornerBottomLeft]} />
          <View style={[styles.frameCorner, styles.frameCornerBottomRight]} />
        </View>

        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={handlePickFromGallery}>
            <Icon name="image-multiple" size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleTakePhoto}
            disabled={isProcessing}>
            {isProcessing ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </TouchableOpacity>

          <View style={styles.placeholderButton} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  topControlsRight: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameGuide: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: width * 0.8,
    height: width * 0.8,
    marginLeft: -width * 0.4,
    marginTop: -width * 0.4,
  },
  frameCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#fff',
  },
  frameCornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  frameCornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  frameCornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  frameCornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#fff',
  },
  placeholderButton: {
    width: 56,
    height: 56,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewImage: {
    width: width,
    height: height,
    resizeMode: 'contain',
  },
  previewHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  previewHeaderButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewHeaderTitle: {
    fontSize: typography.sizes.lg,
    color: '#fff',
    fontFamily: typography.fonts.semibold,
  },
  previewActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  previewActionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: spacing.sm,
  },
  previewActionButtonSecondary: {
    backgroundColor: theme.colors.surface,
  },
  previewActionButtonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  previewActionText: {
    fontSize: typography.sizes.md,
    color: theme.colors.primary,
    fontFamily: typography.fonts.semibold,
  },
  previewActionTextPrimary: {
    fontSize: typography.sizes.md,
    color: '#fff',
    fontFamily: typography.fonts.semibold,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: theme.colors.background,
  },
  permissionTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.bold,
    color: theme.colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  permissionText: {
    fontSize: typography.sizes.md,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.regular,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  permissionButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  permissionButtonText: {
    fontSize: typography.sizes.md,
    color: '#fff',
    fontFamily: typography.fonts.semibold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: theme.colors.textSecondary,
    fontFamily: typography.fonts.regular,
  },
});
