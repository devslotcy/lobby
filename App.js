import React, { useEffect, useState } from 'react';
import SplashScreen from './src/screens/SplashScreen';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { ToastProvider } from './src/context/ToastContext';
import { ProfileViewProvider } from './src/context/ProfileViewContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { InteractionProvider } from './src/context/InteractionContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import { View, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from './src/services/NotificationService';
import SocketService from './src/services/SocketService';
import { useProfileView } from './src/context/ProfileViewContext';
import InAppNotification from './src/components/InAppNotification';
import { NotificationContext } from './src/context/NotificationContext';

import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreenNew';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import ShakeScreen from './src/screens/ShakeScreen';
import NearMeScreen from './src/screens/NearMeScreen';
import DiscoveryScreen from './src/screens/DiscoveryScreen';
import MatchesScreen from './src/screens/MatchesScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import LookingForScreen from './src/screens/LookingForScreen';
import UserProfileViewScreen from './src/screens/UserProfileViewScreen';
import ProfileViewAlertManager from './src/components/ProfileViewAlertManager';
import MatchAnimationScreen from './src/screens/MatchAnimationScreen';
import LikedMeScreen from './src/screens/LikedMeScreen';
import AppSettingsScreen from './src/screens/AppSettingsScreen';
import PrivacyOptionsScreen from './src/screens/PrivacyOptionsScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';
import HelpScreen from './src/screens/HelpScreen';
import VerificationScreen from './src/screens/VerificationScreen';
import TermsScreen from './src/screens/TermsScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import DatingSafetyScreen from './src/screens/DatingSafetyScreen';
import CommunityGuidelinesScreen from './src/screens/CommunityGuidelinesScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <>
      <Tab.Navigator
        initialRouteName="NearMe"
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.surface,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '700',
            color: colors.textPrimary,
          },
          headerTintColor: colors.textPrimary,
          lazy: true,
          tabBarActiveTintColor: '#E94057',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: {
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom + 8,
            paddingTop: 8,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
      <Tab.Screen
        name="Shake"
        component={ShakeScreen}
        options={{
          lazy: false,
          headerShown: false,
          tabBarLabel: t('tabs.shake'),
          tabBarIcon: ({ color, size }) => (
            <View style={{ transform: [{ rotate: '-30deg' }] }}>
              <MaterialCommunityIcons name="vibrate" size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="NearMe"
        component={NearMeScreen}
        options={{
          lazy: false,
          headerShown: false,
          tabBarLabel: t('tabs.nearby'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoveryScreen}
        options={{
          lazy: false,
          headerShown: false,
          tabBarLabel: t('tabs.discover'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        options={{
          lazy: false,
          headerShown: false,
          tabBarLabel: t('tabs.messages'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          lazy: false,
          headerShown: false,
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
    <ProfileViewAlertManager />
    </>
  );
};

const navigationRef = React.createRef();

const AppNavigator = () => {
  const { user, loading, isProfileIncomplete } = React.useContext(AuthContext);
  const { isDarkMode } = useTheme();
  const { showProfileViewAlert } = useProfileView();
  const { notification, showNotification, hideNotification, onlineUsers } = React.useContext(NotificationContext);

  const handleNotificationPress = (notif) => {
    if (notif && notif.match_id) {
      // Navigate to chat screen with the match
      navigationRef.current?.navigate('Chat', {
        match: {
          match_id: notif.match_id,
          user: {
            name: notif.sender_name,
            photo_urls: notif.photo_urls,
          },
        },
      });
    }
  };

  React.useEffect(() => {
    if (user) {
      // Connect socket when user is logged in
      SocketService.connect();

      // Listen for profile view events
      SocketService.on('profile_viewed', (data) => {
        console.log('📬 [App] Profile viewed by:', data.viewer.name);
        showProfileViewAlert(data.viewer);
      }, 'app');

      // Listen for match events (CRITICAL!)
      SocketService.on('new_match', async (data) => {
        console.log('🎉 [App] NEW MATCH received:', data);

        // Get current user info
        const userDataStr = await AsyncStorage.getItem('user');
        const currentUser = userDataStr ? JSON.parse(userDataStr) : {};

        // Navigate to match animation
        if (navigationRef.current) {
          navigationRef.current.navigate('MatchAnimation', {
            currentUser: {
              name: currentUser.name,
              photo_urls: currentUser.photo_urls,
            },
            matchedUser: {
              name: data.matched_user.name,
              photo_urls: data.matched_user.photo_urls,
            },
            matchId: data.match_id,
          });
        }
      }, 'app');

      return () => {
        // Clean up socket listeners
        console.log('🧹 [App] Cleaning up socket listeners');
        SocketService.off('profile_viewed', 'app');
        SocketService.off('new_match', 'app');
      };
    } else {
      // Disconnect socket when user logs out
      SocketService.disconnect();
    }
  }, [user, showProfileViewAlert]);

  if (loading) {
    return null;
  }

  // Deep linking configuration
  const linking = {
    prefixes: ['lobby://', 'https://getlobby.app', 'https://www.getlobby.app'],
    config: {
      screens: {
        ResetPassword: 'reset-password',
        Welcome: '',
        Login: 'login',
        Signup: 'signup',
      },
    },
  };

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent />
      <InAppNotification
        visible={showNotification}
        notification={notification}
        onPress={handleNotificationPress}
        onDismiss={hideNotification}
        onlineUsers={onlineUsers}
      />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="Terms" component={TermsScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          </>
        ) : isProfileIncomplete ? (
          <>
            {/* Eski Flutter app'ten taşınan kullanıcılar — profil tamamlama */}
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="LookingFor" component={LookingForScreen} />
            <Stack.Screen name="Verification" component={VerificationScreen} />
            <Stack.Screen name="UserProfileView" component={UserProfileViewScreen} />
            <Stack.Screen name="LikedMe" component={LikedMeScreen} />
            <Stack.Screen name="AppSettings" component={AppSettingsScreen} />
            <Stack.Screen name="PrivacyOptions" component={PrivacyOptionsScreen} />
            <Stack.Screen name="Feedback" component={FeedbackScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="Terms" component={TermsScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="DatingSafety" component={DatingSafetyScreen} />
            <Stack.Screen name="CommunityGuidelines" component={CommunityGuidelinesScreen} />
            <Stack.Screen
              name="MatchAnimation"
              component={MatchAnimationScreen}
              options={{
                presentation: 'modal',
                gestureEnabled: false,
                headerShown: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    NotificationService.configure((notification) => {
      console.log('📬 Notification tapped:', notification);
    });

    NotificationService.requestPermissions();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <SubscriptionProvider>
                <NotificationProvider>
                  <ProfileViewProvider>
                    <InteractionProvider>
                      <ToastProvider>
                        <AppNavigator />
                        {!splashDone && <SplashScreen onFinish={() => setSplashDone(true)} />}
                      </ToastProvider>
                    </InteractionProvider>
                  </ProfileViewProvider>
                </NotificationProvider>
              </SubscriptionProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
