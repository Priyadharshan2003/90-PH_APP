// app/(guest)/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
// import { useAuth } from "@clerk/clerk-expo"; // Not directly used in this layout, can be removed if not needed elsewhere
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const seen = await AsyncStorage.getItem('onboardingComplete');
      if (!seen) {
        setShowOnboarding(true);
        router.replace('/Onboarding');
      } else {
        setShowOnboarding(false);
      }
    })();
  }, [router]);

  if (showOnboarding) return null;

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#f97316',
          tabBarInactiveTintColor: '#6b7280',
          tabBarStyle: {
            backgroundColor: 'white',
            borderTopColor: '#f97316',
            borderTopEndRadius: 20,
            borderTopStartRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 5,
            elevation: 5,
            height: 60 + insets.bottom,
            paddingBottom: 5 + insets.bottom,
            paddingTop: 5,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="Home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Ionicons size={24} name="home-outline" color={color} />,
          }}
        />
        <Tabs.Screen
          name="Explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color }) => <Ionicons size={24} name="search" color={color} />,
          }}
        />
        <Tabs.Screen
          name="Camera"
          options={{
            title: 'Camera',
            tabBarIcon: ({ color }) => <Ionicons size={24} name="camera-outline" color={color} />,
          }}
        />
        <Tabs.Screen
          name="SellRequest"
          options={{
            title: 'Sell',
            tabBarIcon: ({ color }) => <Ionicons size={24} name="cash-outline" color={color} />,
          }}
        />
        <Tabs.Screen
          name="Profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <Ionicons size={24} name="person-outline" color={color} />,
          }}
        />
      </Tabs>
      {/* Safe area for bottom below navigator */}
      {insets.bottom > 0 && (
        <SafeAreaView style={{ backgroundColor: 'white' }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // safeArea style is now less critical for the tab bar itself, but useful for main screen content
  // safeArea: {
  //   flex: 1,
  //   backgroundColor: "#FFF7ED", // Updated to match new theme
  // },
  container: {
    flex: 1,
    backgroundColor: '#FFF7ED', // Updated to match new theme background
  },
  tabBar: {
    backgroundColor: '#FFF7ED', // Updated to match new theme background
    borderTopColor: '#F97316', // Updated to match new theme active color
    borderTopEndRadius: 0, // Remove radius for a flat look and to avoid color bleed
    borderTopStartRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 5,
    height: 60, // Base height
    paddingBottom: 8, // Updated to match new theme padding
    paddingTop: 8, // Updated to match new theme padding
    borderTopWidth: 1, // Add a border for clear separation
    overflow: 'visible', // Prevent clipping
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold', // Added font family to match new theme
  },
  // header styles are not directly used here for the tab bar but might be for inner screens
  header: {
    backgroundColor: '#F97316', // Updated to match new theme
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
});
