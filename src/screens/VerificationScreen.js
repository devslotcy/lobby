import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { userAPI } from '../services/api';
import { useToast } from '../hooks/useToast';

export default function VerificationScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('front');
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cameraRef = useRef(null);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          skipProcessing: false,
        });
        setCapturedPhoto(photo);
      } catch (error) {
        console.error('Error taking picture:', error);
        showToast(t('verification.errors.failedToTakePicture'));
      }
    }
  };

  const retakePicture = () => {
    setCapturedPhoto(null);
  };

  const submitVerification = async () => {
    if (!capturedPhoto) return;

    try {
      setIsSubmitting(true);

      // Create FormData to upload the photo
      const formData = new FormData();
      formData.append('verification_photo', {
        uri: capturedPhoto.uri,
        type: 'image/jpeg',
        name: `verification_${Date.now()}.jpg`,
      });

      await userAPI.submitVerification(formData);

      showToast(t('verification.submitted'));
      navigation.goBack();
    } catch (error) {
      console.error('Error submitting verification:', error);
      showToast(error.response?.data?.message || t('verification.errors.failedToSubmit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = createStyles(colors, isDarkMode);

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>{t('verification.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('verification.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="camera-off" size={64} color={colors.textTertiary} />
          <Text style={styles.permissionText}>{t('verification.permissionRequired')}</Text>
          <Text style={styles.permissionSubtext}>
            {t('verification.needCameraAccess')}
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>{t('verification.grantPermission')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (capturedPhoto) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={retakePicture} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('verification.reviewPhoto')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedPhoto.uri }} style={styles.previewImage} />
        </View>

        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>{t('verification.photoCaptured')}</Text>
          <Text style={styles.instructionsText}>
            {t('verification.reviewMessage')}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={retakePicture}
            disabled={isSubmitting}
          >
            <Text style={styles.retakeButtonText}>{t('verification.retakePhoto')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={submitVerification}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>{t('verification.submitForVerification')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('verification.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing={facing}
          ref={cameraRef}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.faceFrame} />
          </View>
        </CameraView>
      </View>

      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>{t('verification.instructions.title')}</Text>
        <Text style={styles.instructionsText}>
          • {t('verification.instructions.1')}{'\n'}
          • {t('verification.instructions.2')}{'\n'}
          • {t('verification.instructions.3')}{'\n'}
          • {t('verification.instructions.4')}
        </Text>
      </View>

      <View style={styles.captureButtonContainer}>
        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
    },
    permissionText: {
      marginTop: 16,
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    permissionSubtext: {
      marginTop: 8,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    permissionButton: {
      backgroundColor: '#fa1170',
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 12,
    },
    permissionButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    cameraContainer: {
      flex: 1,
      margin: 16,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: '#000',
    },
    camera: {
      flex: 1,
    },
    cameraOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    faceFrame: {
      width: 250,
      height: 320,
      borderWidth: 3,
      borderColor: '#FFFFFF',
      borderRadius: 160,
      backgroundColor: 'transparent',
      opacity: 0.5,
    },
    instructionsCard: {
      marginHorizontal: 16,
      marginTop: 12,
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: isDarkMode ? colors.border : 'transparent',
    },
    instructionsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    instructionsText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    captureButtonContainer: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    captureButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: '#fa1170',
    },
    captureButtonInner: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#fa1170',
    },
    previewContainer: {
      flex: 1,
      margin: 16,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: '#000',
    },
    previewImage: {
      flex: 1,
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    buttonContainer: {
      paddingHorizontal: 16,
      paddingVertical: 24,
      gap: 12,
    },
    retakeButton: {
      backgroundColor: colors.surface,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    retakeButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    submitButton: {
      backgroundColor: '#fa1170',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
