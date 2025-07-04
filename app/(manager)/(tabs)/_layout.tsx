// app/(manager)/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  const isSmallDevice = width < 375;

  // Example dynamic condition (can come from API, AsyncStorage, or Context)
  const [hasLeaveAccess, setHasLeaveAccess] = useState(false);

  useEffect(() => {
    // Simulate async check (e.g., user role or permissions)
    const fetchPermissions = async () => {
      // For now, fake it:
      const access = true; // replace with actual logic
      setHasLeaveAccess(access);
    };
    fetchPermissions();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#f97316',
          shadowColor: '#000',
    
          shadowOffset: { width: 0, height: Platform.OS === 'ios' ? -2 : -4 },
          shadowOpacity: 0.07,
          shadowRadius: 8,
          elevation: 8,
          height: Platform.OS === 'ios' ? 60 + insets.bottom : 64 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 6,
          marginHorizontal: isSmallDevice ? 0 : 8,
        
        },
        tabBarLabelStyle: {
          fontSize: isSmallDevice ? 10 : 13,
          fontWeight: '600',
          fontFamily: Platform.select({
            ios: 'Manrope',
            android: 'manrope',
            default: 'System',
          }),
        },
        tabBarItemStyle: {
          marginVertical: 2,
        },
      }}
    >
      <Tabs.Screen
        name="Home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={focused ? 26 : 22} name="home-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={focused ? 26 : 22} name="add-circle-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Assign"
        options={{
          title: 'Visit Requests',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={focused ? 26 : 22} name="list-outline" color={color} />
          ),
        }}
      />
      {hasLeaveAccess && (
        <Tabs.Screen
          name="Leave"
          options={{
            title: 'Leave',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons size={focused ? 26 : 22} name="calendar-outline" color={color} />
            ),
          }}
        />
      )}
      <Tabs.Screen
        name="Profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={focused ? 26 : 22} name="person-outline" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
