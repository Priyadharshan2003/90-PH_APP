// app/(guest)/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  // const { signOut } = useAuth(); // Example of useAuth if needed

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#f97316', // orange-500
        tabBarInactiveTintColor: '#6b7280', // gray-500
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#f97316',
          borderTopEndRadius: 20,
          borderTopStartRadius: 20,
          // Add a subtle shadow for iOS, elevation for Android
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 5,
          elevation: 5, // Android shadow
          height: 60, // Consistent height for tab bar
          paddingBottom: 5, // Adjust padding for icon/label
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12, // Smaller font for label
          fontWeight: '600', // Semibold
        },
      }}>
      <Tabs.Screen
        name="Home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="home-outline" color={color} />, // Size adjusted for consistency
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
        name="Booking"
        options={{
          title: 'Booking',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="calendar-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="Profile"
        options={{
          title: 'Profile', // Capitalized "Profile" for consistency
          tabBarIcon: ({ color }) => <Ionicons size={24} name="person-outline" color={color} />,
          // Example of a custom header for profile screen if needed:
          // headerTitle: () => (
          //   <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>My Profile</Text>
          // ),
          // headerShown: true, // Only for this screen
        }}
      />
    </Tabs>
  );
}
