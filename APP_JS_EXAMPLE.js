/**
 * App.js - SubscriptionProvider ile Entegre Edilmiş Örnek
 *
 * Mevcut App.js dosyanızı bu şekilde güncelleyin
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Contexts
import { AuthProvider } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { InteractionProvider } from './src/context/InteractionContext';
import { ProfileViewProvider } from './src/context/ProfileViewContext';
// **NEW**: Import SubscriptionProvider
import { SubscriptionProvider } from './src/context/SubscriptionContext';

// Screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import ShakeScreen from './src/screens/ShakeScreen';
import NearbyScreen from './src/screens/NearbyScreen';
import DiscoveryScreen from './src/screens/DiscoveryScreen';
import MatchesScreen from './src/screens/MatchesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChatScreen from './src/screens/ChatScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Shake') {
            iconName = focused ? 'phone-portrait' : 'phone-portrait-outline';
          } else if (route.name === 'Nearby') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'Discover') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Matches') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Shake" component={ShakeScreen} />
      <Tab.Screen name="Nearby" component={NearbyScreen} />
      <Tab.Screen name="Discover" component={DiscoveryScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    // **ÖNEMLI**: Provider'ların doğru sırası:
    // 1. SubscriptionProvider en dışta (diğer provider'lar subscription durumunu kullanabilir)
    // 2. AuthProvider (kullanıcı bilgisi için)
    // 3. Diğer provider'lar
    <SubscriptionProvider>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <InteractionProvider>
              <ProfileViewProvider>
                <NavigationContainer>
                  {/* Navigation logic buraya */}
                  <AppStack />
                </NavigationContainer>
              </ProfileViewProvider>
            </InteractionProvider>
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </SubscriptionProvider>
  );
}

/**
 * NOTLAR:
 *
 * 1. SubscriptionProvider en dışta olmalı çünkü:
 *    - IAP servisini initialize eder
 *    - AuthContext'e ihtiyaç duyar (içeride olabilir)
 *    - Tüm ekranlarda subscription durumu erişilebilir olmalı
 *
 * 2. Eğer conditional rendering yapıyorsanız (user var mı yok mu):
 */

// Alternatif: Conditional Rendering ile
function AppWithConditionalNav() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

/**
 * 3. SubscriptionProvider kullanımı:
 *
 * Herhangi bir component'te:
 *
 * import { useSubscription } from '../context/SubscriptionContext';
 *
 * function MyComponent() {
 *   const { isPremium, remainingShakes, canShake } = useSubscription();
 *
 *   return (
 *     <View>
 *       {isPremium ? (
 *         <Text>Premium User</Text>
 *       ) : (
 *         <Text>Remaining Shakes: {remainingShakes}</Text>
 *       )}
 *     </View>
 *   );
 * }
 */
