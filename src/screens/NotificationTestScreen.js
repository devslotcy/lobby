import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform
} from 'react-native';
import NotificationTestHelper from '../services/__tests__/NotificationTest';
import NotificationService from '../services/NotificationService';
import { useLanguage } from '../context/LanguageContext';

/**
 * Notification Test Screen
 *
 * Bildirimleri test etmek için kullanılır
 *
 * KULLANIM:
 * 1. Bu ekranı navigation'a ekleyin
 * 2. Ekranı açın
 * 3. "Initialize Service" butonuna basın
 * 4. İstediğiniz bildirimi test edin
 * 5. Uygulamayı arka plana alın (home butonuna basın)
 * 6. Bildirimin geldiğini görün
 */

const NotificationTestScreen = () => {
  const { t } = useLanguage();
  const [initialized, setInitialized] = useState(false);
  const [serviceInfo, setServiceInfo] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    checkIfInitialized();
  }, []);

  const checkIfInitialized = () => {
    const isConfigured = NotificationService.isConfigured();
    setInitialized(isConfigured);
    if (isConfigured) {
      setServiceInfo({
        pushToken: NotificationService.getPushToken(),
        localOnly: NotificationService.isLocalOnly()
      });
    }
  };

  const handleInitialize = async () => {
    try {
      setTesting(true);
      const result = await NotificationTestHelper.initialize();
      setInitialized(true);
      setServiceInfo({
        pushToken: result.expoPushToken,
        localOnly: result.mode === 'local'
      });
      Alert.alert(t('notificationTest.successTitle'), t('notificationTest.initializeSuccess'));
    } catch (error) {
      Alert.alert(t('notificationTest.errorTitle'), error.message);
    } finally {
      setTesting(false);
    }
  };

  const handleTest = async (testFn, name) => {
    if (!initialized) {
      Alert.alert(t('notificationTest.warningTitle'), t('notificationTest.initializeFirst'));
      return;
    }

    try {
      setTesting(true);
      await testFn();
      Alert.alert(
        t('notificationTest.successTitle'),
        t('notificationTest.notificationSent', { name }),
        [{ text: t('common.ok') }]
      );
    } catch (error) {
      Alert.alert(t('notificationTest.errorTitle'), error.message);
    } finally {
      setTesting(false);
    }
  };

  const TestButton = ({ title, onPress, color = '#E94057' }) => (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: color }]}
      onPress={onPress}
      disabled={testing}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('notificationTest.title')}</Text>
        <Text style={styles.subtitle}>
          {t('notificationTest.subtitle')}
        </Text>
      </View>

      {/* Service Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('notificationTest.serviceStatus')}</Text>
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>
            {t('notificationTest.status')}: {initialized ? t('notificationTest.statusInitialized') : t('notificationTest.statusNotInitialized')}
          </Text>
          {serviceInfo && (
            <>
              <Text style={styles.statusText}>
                {t('notificationTest.mode')}: {serviceInfo.localOnly ? t('notificationTest.modeLocal') : t('notificationTest.modePush')}
              </Text>
              {serviceInfo.pushToken && (
                <Text style={styles.statusText}>
                  {t('notificationTest.token')}: {serviceInfo.pushToken.substring(0, 20)}...
                </Text>
              )}
            </>
          )}
        </View>

        {!initialized && (
          <TestButton
            title={t('notificationTest.initializeButton')}
            onPress={handleInitialize}
            color="#4CAF50"
          />
        )}
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('notificationTest.howToTest')}</Text>
        <View style={styles.instructionCard}>
          <Text style={styles.instructionText}>{t('notificationTest.instruction1')}</Text>
          <Text style={styles.instructionText}>{t('notificationTest.instruction2')}</Text>
          <Text style={styles.instructionText}>{t('notificationTest.instruction3')}</Text>
          <Text style={styles.instructionText}>{t('notificationTest.instruction4')}</Text>
          <Text style={styles.noteText}>
            {t('notificationTest.note')}
          </Text>
        </View>
      </View>

      {/* Test Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('notificationTest.testNotifications')}</Text>

        <TestButton
          title={t('notificationTest.testMessage')}
          onPress={() => handleTest(
            () => NotificationTestHelper.testMessageNotification(),
            t('notificationTest.messageNotification')
          )}
        />

        <TestButton
          title={t('notificationTest.testMatch')}
          onPress={() => handleTest(
            () => NotificationTestHelper.testMatchNotification(),
            t('notificationTest.matchNotification')
          )}
        />

        <TestButton
          title={t('notificationTest.testLike')}
          onPress={() => handleTest(
            () => NotificationTestHelper.testLikeNotification(),
            t('notificationTest.likeNotification')
          )}
        />

        <TestButton
          title={t('notificationTest.testProfileVisit')}
          onPress={() => handleTest(
            () => NotificationTestHelper.testProfileVisitNotification(),
            t('notificationTest.profileVisitNotification')
          )}
        />

        <TestButton
          title={t('notificationTest.testFavorite')}
          onPress={() => handleTest(
            () => NotificationTestHelper.testFavoriteNotification(),
            t('notificationTest.favoriteNotification')
          )}
        />

        <TestButton
          title={t('notificationTest.testWave')}
          onPress={() => handleTest(
            () => NotificationTestHelper.testWaveNotification(),
            t('notificationTest.waveNotification')
          )}
        />

        <TestButton
          title={t('notificationTest.testShakeMatch')}
          onPress={() => handleTest(
            () => NotificationTestHelper.testShakeMatchNotification(),
            t('notificationTest.shakeMatchNotification')
          )}
        />

        <TestButton
          title={t('notificationTest.testAll')}
          onPress={() => handleTest(
            () => NotificationTestHelper.testAllNotifications(),
            t('notificationTest.allNotifications')
          )}
          color="#FF6B6B"
        />
      </View>

      {/* Badge Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('notificationTest.badgeTests')}</Text>

        <TestButton
          title={t('notificationTest.setBadge5')}
          onPress={() => handleTest(
            () => NotificationService.setBadgeNumber(5),
            t('notificationTest.badgeSet')
          )}
          color="#9C27B0"
        />

        <TestButton
          title={t('notificationTest.incrementBadge')}
          onPress={() => handleTest(
            () => NotificationService.incrementBadge(),
            t('notificationTest.badgeIncremented')
          )}
          color="#9C27B0"
        />

        <TestButton
          title={t('notificationTest.clearBadge')}
          onPress={() => handleTest(
            () => NotificationService.clearBadge(),
            t('notificationTest.badgeCleared')
          )}
          color="#9C27B0"
        />
      </View>

      {/* Utilities */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('notificationTest.utilities')}</Text>

        <TestButton
          title={t('notificationTest.cancelAll')}
          onPress={() => handleTest(
            () => NotificationTestHelper.cancelAll(),
            t('notificationTest.notificationsCanceled')
          )}
          color="#FF9800"
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t('notificationTest.tip')}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#E94057',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  instructionCard: {
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  instructionText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#E94057',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default NotificationTestScreen;
