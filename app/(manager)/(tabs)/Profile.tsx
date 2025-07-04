import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics'; // Import Haptics for feedback
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Dimensions,
  Image, // Import StatusBar for styling
  Platform,
  ScrollView, // Import Dimensions for scaling
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Import SafeAreaView

const { width } = Dimensions.get('window');

// --- Scaling Utilities ---
const guidelineBaseWidth = 375;
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const scaleFont = (size: number) => (width / guidelineBaseWidth) * size;

// --- Color Palette (Consistent with other screens) ---
const colors = {
  primary: '#0F172A', // Dark blue/black
  secondary: '#1E293B', // Slightly lighter dark blue
  accent: '#FF6B00', // Bright orange for key elements
  accentLight: '#FFA750', // Lighter orange
  success: '#10B981', // Green for available status
  error: '#EF4444', // Red for errors/sold out
  surface: '#FFFFFF', // White for cards/background
  surfaceElevated: '#F8FAFC', // Light gray for elevated surfaces
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#94A3B8',
    inverse: '#FFFFFF',
  },
  border: {
    light: '#E2E8F0',
    medium: '#CBD5E1',
    dark: '#94A3B8',
  },
};

const Profile = () => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { signOut, isSignedIn } = useAuth();
  const router = useRouter();

  // Handle user sign out
  const handleSignOut = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      await signOut();
      router.replace('/(auth)/sign-in' as any); // Type assertion for router
    } catch (err) {
      console.error('Error signing out:', err);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  // --- Loading State UI ---
  if (!isUserLoaded) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surfaceElevated} />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { fontFamily: 'manrope' }]}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  // --- Not Signed In State UI ---
  if (!isSignedIn) {
    return (
      <SafeAreaView style={styles.notSignedInContainer} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surfaceElevated} />
        <Ionicons name="person-circle-outline" size={scale(80)} color={colors.text.tertiary} />
        <Text style={[styles.welcomeText, { fontFamily: 'manrope' }]}>Welcome to Your Profile</Text>
        <Text style={[styles.signInPrompt, { fontFamily: 'manrope' }]}>
          Please sign in to view your details.
        </Text>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            router.push('/(auth)/sign-in' as any);
          }}>
          <Text style={[styles.signInButtonText, { fontFamily: 'manrope' }]}>Sign In</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- Main Profile Content UI ---
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surfaceElevated} />
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {user?.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user?.firstName?.[0] || user?.lastName?.[0] || '?'}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.name, { fontFamily: 'manrope' }]}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={[styles.email, { fontFamily: 'manrope' }]}>
            {user?.primaryEmailAddress?.emailAddress}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: 'manrope' }]}>Account Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={scale(20)} color={colors.text.secondary} />
              <Text style={[styles.infoText, { fontFamily: 'manrope' }]}>
                {user?.primaryEmailAddress?.emailAddress}
              </Text>
            </View>
            {user?.phoneNumbers?.[0]?.phoneNumber && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={scale(20)} color={colors.text.secondary} />
                <Text style={[styles.infoText, { fontFamily: 'manrope' }]}>
                  {user.phoneNumbers[0].phoneNumber}
                </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={scale(20)}
                color={colors.text.secondary}
              />
              <Text style={[styles.infoText, { fontFamily: 'manrope' }]}>
                {user?.primaryEmailAddress?.verification?.status === 'verified'
                  ? 'Email Verified'
                  : 'Email Not Verified'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={scale(20)} color={colors.text.inverse} />
          <Text style={[styles.signOutButtonText, { fontFamily: 'manrope' }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- StyleSheet for consistent and organized styling ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceElevated, // Use elevated surface as main background
  },
  contentContainer: {
    padding: scale(20), // Increased padding for better spacing
    paddingBottom: Platform.OS === 'ios' ? scale(30) : scale(20), // Adjust bottom padding for iOS safe area
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  loadingText: {
    marginTop: scale(16),
    fontSize: scaleFont(16),
    color: colors.text.secondary,
  },
  notSignedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: scale(20),
  },
  welcomeText: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: scale(8),
    marginTop: scale(20),
  },
  signInPrompt: {
    fontSize: scaleFont(16),
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: scale(24),
  },
  signInButton: {
    backgroundColor: colors.accent,
    paddingVertical: scale(16),
    paddingHorizontal: scale(30),
    borderRadius: scale(12),
    marginTop: scale(16),
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.2,
    shadowRadius: scale(8),
    elevation: 4,
  },
  signInButtonText: {
    color: colors.text.inverse,
    fontSize: scaleFont(18),
    fontWeight: '600',
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: scale(32), // Increased margin
    paddingVertical: scale(20),
  },
  avatarContainer: {
    marginBottom: scale(20), // Increased margin
    borderWidth: scale(3), // Border around avatar
    borderColor: colors.accentLight,
    borderRadius: scale(55), // Match avatar size + border
    padding: scale(2), // Padding to make border visible
  },
  avatar: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
  },
  avatarPlaceholder: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: colors.accent, // Accent color for placeholder
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: scaleFont(48), // Larger font for initial
    color: colors.text.inverse,
    fontWeight: 'bold',
  },
  name: {
    fontSize: scaleFont(26), // Larger name font
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: scale(4),
  },
  email: {
    fontSize: scaleFont(16),
    color: colors.text.secondary,
  },
  section: {
    marginBottom: scale(28), // Increased margin
  },
  sectionTitle: {
    fontSize: scaleFont(20), // Larger title font
    fontWeight: '700', // Bolder title
    color: colors.text.primary,
    marginBottom: scale(16), // Increased margin
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: scale(16), // More rounded corners
    padding: scale(20), // Increased padding
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.08,
    shadowRadius: scale(10),
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(16), // Increased margin
    paddingVertical: scale(4), // Little padding for touchability if needed
  },
  infoText: {
    fontSize: scaleFont(16),
    color: colors.text.primary, // Darker text for readability
    marginLeft: scale(16), // Increased margin
  },
  signOutButton: {
    backgroundColor: colors.error, // Red for sign out
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
    borderRadius: scale(16), // More rounded
    marginTop: scale(20), // Increased margin
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: scale(6) },
    shadowOpacity: 0.25,
    shadowRadius: scale(10),
    elevation: 6,
  },
  signOutButtonText: {
    color: colors.text.inverse,
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    marginLeft: scale(12), // Increased margin
  },
});

export default Profile;
