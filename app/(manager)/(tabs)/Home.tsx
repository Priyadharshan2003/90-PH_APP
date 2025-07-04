import { useUser } from '@clerk/clerk-expo';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, Surface } from 'react-native-paper';
import { getAllPlots, getProjects, getUserFeedback, getVisitRequests } from '../../../lib/api'; // Ensure this path is correct

// --- Constants ---
const screenWidth = Dimensions.get('window').width;
const { height: screenHeight } = Dimensions.get('window');

// UI Constants for consistent styling
const SAFE_AREA_TOP = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
const CARD_SPACING = 16;
const BORDER_RADIUS = 16;
const SHADOW_CONFIG = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

// Define a color palette for consistency
const COLORS = {
  primary: '#007AFF', // iOS Blue
  secondary: '#5AC8FA', // Lighter blue
  background: '#F2F2F7', // Light gray background
  cardBackground: '#FFFFFF', // White cards
  textPrimary: '#1C1C1E', // Dark text
  textSecondary: '#8E8E93', // Gray text
  success: '#34C759', // Green
  warning: '#FF9500', // Orange
  error: '#FF453A', // Red
  info: '#FFD60A', // Yellow/Gold for rating
  border: '#E5E5EA', // Light border for cards
};

// --- Interfaces ---
interface DashboardStats {
  projects: number;
  plots: number;
  availablePlots: number;
  visitRequests: number;
  pendingVisits: number;
  avgRating: number;
  recentSales: number;
}

interface Plot {
  id: string;
  status: 'AVAILABLE' | 'SOLD' | 'BOOKED';
  createdAt: string; // Assuming ISO string date
  // Add other plot properties as needed
}

interface VisitRequest {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'APPROVED' | 'REJECTED' | 'CANCELED';
  // Add other visit request properties as needed
}

interface UserFeedback {
  id: string;
  rating: number; // Assuming rating is a number
  // Add other feedback properties as needed
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  userId: string;
  createdAt: string;
  user?: {
    id: string;
    clerkId: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    createdAt: string;
    updatedAt: string;
  };
}

// --- Main Component ---
export default function ManagerHomeTabScreen() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    projects: 0,
    plots: 0,
    availablePlots: 0,
    visitRequests: 0,
    pendingVisits: 0,
    avgRating: 0,
    recentSales: 0,
  });
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifVisible, setNotifVisible] = useState(false);

  /**
   * Fetches and processes all dashboard data.
   * Handles loading states, errors, and data transformations.
   */
  const loadData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const currentUserId = user?.id;

      if (!currentUserId) {
        console.warn('Clerk user ID not available. Dashboard data might be limited.');
        // Consider showing a specific message or redirecting if user ID is critical for all data
      }

      // Use Promise.allSettled to allow some API calls to fail without blocking others
      const results = await Promise.allSettled([
        getProjects(),
        getAllPlots(),
        getVisitRequests(),
        currentUserId ? getUserFeedback(currentUserId) : Promise.resolve([] as UserFeedback[]),
      ]);

      const projectsData: any[] = results[0].status === 'fulfilled' ? results[0].value : [];
      // Map PlotType[] to Plot[], converting "ADVANCE" status to "BOOKED"
      const plotsData: Plot[] =
        results[1].status === 'fulfilled'
          ? Array.isArray(results[1].value)
            ? results[1].value.map((p: any) => ({
                ...p,
                status: p.status === 'ADVANCE' ? 'BOOKED' : p.status,
              }))
            : []
          : [];
      const visitsData: VisitRequest[] = results[2].status === 'fulfilled' ? results[2].value : [];
      const feedbackData: UserFeedback[] =
        results[3].status === 'fulfilled' && Array.isArray(results[3].value)
          ? results[3].value
          : [];

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const apiNames = ['Projects', 'Plots', 'Visits', 'Feedback'];
          // Defensive: result.reason may not be an Error object
          const reasonMsg =
            result.reason && result.reason.message ? result.reason.message : String(result.reason);
          // Only log actual API errors for debugging, do not set user-facing error for partial failures
          if (apiNames[index] !== 'Visits') {
            console.warn(`Failed to load ${apiNames[index]}:`, reasonMsg);
          }
        }
      });

      // Ensure data is array before processing
      const safeProjectsData = Array.isArray(projectsData) ? projectsData : [];
      const safePlotsData = Array.isArray(plotsData) ? plotsData : [];
      const safeVisitsData = Array.isArray(visitsData) ? visitsData : [];
      const safeFeedbackData = Array.isArray(feedbackData) ? feedbackData : [];

      const availablePlots = safePlotsData.filter((p) => p?.status === 'AVAILABLE').length;
      const pendingVisits = safeVisitsData.filter((v) => v?.status === 'PENDING').length;

      const avgRating =
        safeFeedbackData.length > 0
          ? safeFeedbackData.reduce((sum: number, f: UserFeedback) => {
              const rating = typeof f?.rating === 'number' ? f.rating : 0;
              return sum + rating;
            }, 0) / safeFeedbackData.length
          : 0;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0); // Set to start of the day

      const recentSales = safePlotsData.filter((p) => {
        if (p?.status !== 'SOLD' || !p?.createdAt) return false;
        try {
          return new Date(p.createdAt) >= sevenDaysAgo;
        } catch (e) {
          console.warn('Invalid createdAt date for plot:', p.createdAt, e);
          return false;
        }
      }).length;

      setStats({
        projects: safeProjectsData.length,
        plots: safePlotsData.length,
        availablePlots,
        visitRequests: safeVisitsData.length,
        pendingVisits,
        avgRating: parseFloat(avgRating.toFixed(1)),
        recentSales,
      });
    } catch (err: any) {
      console.error('Critical error loading dashboard data:', err);
      // More user-friendly and actionable error messages
      let errorMessage = 'Failed to load dashboard data. Please check your network connection.';
      if (err.message && err.message.includes('Network request failed')) {
        errorMessage =
          'Network issue: Could not connect to the server. Please check your internet connection.';
      } else if (err.message) {
        errorMessage = err.message; // Use specific error message if available
      }
      setError(errorMessage);

      // Reset stats on critical error
      setStats({
        projects: 0,
        plots: 0,
        availablePlots: 0,
        visitRequests: 0,
        pendingVisits: 0,
        avgRating: 0,
        recentSales: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]); // Re-run if user ID changes

  useEffect(() => {
    if (isLoaded) {
      // Only attempt to load if Clerk is loaded
      if (user) {
        loadData();
      } else {
        // User is not authenticated, display an appropriate message
        setError('You are not authenticated. Please log in to view the dashboard.');
        setLoading(false);
      }
    }
  }, [loadData, isLoaded, user]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) {
        setNotifications([]);
        return;
      }
      try {
        const res = await fetch('https://90-dph.vercel.app/api/notifications');
        const data = await res.json();
        // Filter notifications for this user
        const userNotifications = data.notifications.filter(
          (n: Notification) => n.user?.clerkId === user.id || n.userId === user.id
        );
        setNotifications(userNotifications);
      } catch (err) {
        setNotifications([]);
      }
    };
    fetchNotifications();
  }, [user?.id]);

  /**
   * Handles pull-to-refresh action.
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(); // Re-fetch all data
  }, [loadData]);

  /**
   * Displays an alert for critical errors.
   */
  const showErrorAlert = useCallback(() => {
    if (error) {
      Alert.alert(
        'Dashboard Error',
        error,
        [
          { text: 'Retry', onPress: loadData, style: 'default' },
          { text: 'Dismiss', style: 'cancel' },
        ],
        { cancelable: true } // Allow dismissing the alert
      );
    }
  }, [error, loadData]);

  useEffect(() => {
    // Only show alert if an error exists and it's not currently loading
    if (error && !loading) {
      showErrorAlert();
    }
  }, [error, loading, showErrorAlert]);

  /**
   * Returns a greeting based on the current time of day.
   * @returns {string} The appropriate greeting (Good Morning, Good Afternoon, Good Evening).
   */
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // --- Render Logic ---

  // Initial loading/Authentication check
  if (!isLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <ActivityIndicator
          animating={true}
          size="large"
          color={COLORS.primary}
          accessibilityLabel="Loading indicator"
        />
        <Text
          style={[styles.loadingText, { fontFamily: 'manrope' }]}
          accessibilityLabel="Loading dashboard data">
          {!isLoaded ? 'Authenticating user...' : 'Loading Dashboard...'}
        </Text>
      </View>
    );
  }

  // Display authentication error if user is not loaded and not authenticated
  if (!user && !loading && isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <Ionicons
          name="person-circle-outline"
          size={80}
          color={COLORS.primary}
          accessibilityLabel="Authentication required icon"
        />
        <Text style={[styles.authErrorTitle, { fontFamily: 'manrope' }]}>
          Authentication Required
        </Text>
        <Text style={[styles.authErrorSubtitle, { fontFamily: 'manrope' }]}>
          Please ensure you are logged in to access the dashboard.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.replace('/')} // Redirect to login/onboarding or Home if needed
          accessibilityLabel="Go to login screen"
          accessibilityRole="button"
          testID="loginRedirectButton">
          <Text style={[styles.retryButtonText, { fontFamily: 'manrope' }]}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]} // For Android
            accessibilityLabel="Pull to refresh dashboard data"
          />
        }
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text
              style={[styles.greeting, { fontFamily: 'manrope' }]}
              accessibilityLabel={`Greeting ${user?.firstName || 'Manager'}`}>
              {getGreeting()}
            </Text>
            <Text
              style={[styles.headerTitle, { fontFamily: 'manrope' }]}
              accessibilityRole="header">
              Dashboard
            </Text>
          </View>
          {/* Notification Bell */}
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setNotifVisible(true)}
            accessibilityLabel="Go to notifications"
            accessibilityRole="button"
            testID="notificationsButton">
            <Ionicons name="notifications-outline" size={30} color={COLORS.warning} />
            {notifications.some((n) => !n.isRead) && (
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  backgroundColor: COLORS.warning,
                  borderRadius: 8,
                  width: 12,
                  height: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              />
            )}
          </TouchableOpacity>
          {/* Notification Modal */}
          <Modal
            visible={notifVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setNotifVisible(false)}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }}
              onPress={() => setNotifVisible(false)}
              activeOpacity={1}
            />
            <View
              style={{
                position: 'absolute',
                top: 60,
                right: 20,
                left: 20,
                backgroundColor: '#fff',
                borderRadius: 16,
                padding: 20,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 10,
              }}>
              <Text style={{ fontFamily: 'manrope-bold', fontSize: 18, marginBottom: 10 }}>
                Notifications
              </Text>
              {notifications.length === 0 ? (
                <Text style={{ fontFamily: 'manrope', color: '#888' }}>No notifications</Text>
              ) : (
                notifications.map((n) => (
                  <View key={n.id} style={{ marginBottom: 12 }}>
                    <Text style={{ fontFamily: 'manrope-bold', color: COLORS.warning }}>
                      {n.title}
                    </Text>
                    <Text style={{ fontFamily: 'manrope', color: '#444' }}>{n.message}</Text>
                    <Text style={{ fontFamily: 'manrope', color: '#bbb', fontSize: 12 }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </Modal>
        </View>

        {/* Error Banner (only shows if 'error' state is not null) */}
        {error && (
          <Surface style={styles.errorBanner} accessibilityLiveRegion="assertive">
            <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.error} />
            <Text
              style={[styles.errorText, { fontFamily: 'manrope' }]}
              accessibilityLabel={`Error: ${error}`}>
              {error}
            </Text>
            <TouchableOpacity
              onPress={loadData}
              accessibilityLabel="Retry loading data"
              accessibilityRole="button"
              testID="errorRetryButton">
              <Text style={[styles.retryText, { fontFamily: 'manrope' }]}>Retry</Text>
            </TouchableOpacity>
          </Surface>
        )}

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Project Card - now uses only statCard and its own icon container color */}
          <Surface style={styles.statCard} accessibilityLabel={`Total projects: ${stats.projects}`}>
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.primary + '15' }]}>
              <MaterialCommunityIcons name="office-building" size={24} color={COLORS.primary} />
            </View>
            <Text style={[styles.statValue, { fontFamily: 'manrope' }]} testID="projectsCount">
              {stats.projects}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: 'manrope' }]}>Projects</Text>
          </Surface>

          <Surface style={styles.statCard} accessibilityLabel={`Total plots: ${stats.plots}`}>
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.success + '15' }]}>
              <MaterialCommunityIcons name="map-marker" size={24} color={COLORS.success} />
            </View>
            <Text style={[styles.statValue, { fontFamily: 'manrope' }]} testID="plotsCount">
              {stats.plots}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: 'manrope' }]}>Total Plots</Text>
          </Surface>

          <Surface
            style={styles.statCard}
            accessibilityLabel={`Available plots: ${stats.availablePlots}`}>
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.secondary + '15' }]}>
              <MaterialCommunityIcons name="home-city" size={24} color={COLORS.secondary} />
            </View>
            <Text
              style={[styles.statValue, { fontFamily: 'manrope' }]}
              testID="availablePlotsCount">
              {stats.availablePlots}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: 'manrope' }]}>Available</Text>
          </Surface>

          <Surface
            style={styles.statCard}
            accessibilityLabel={`Visit requests: ${stats.visitRequests}`}>
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.warning + '15' }]}>
              <MaterialCommunityIcons name="calendar-clock" size={24} color={COLORS.warning} />
            </View>
            <Text style={[styles.statValue, { fontFamily: 'manrope' }]} testID="visitRequestsCount">
              {stats.visitRequests}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: 'manrope' }]}>Visits</Text>
          </Surface>

          <Surface
            style={styles.statCard}
            accessibilityLabel={`Pending visits: ${stats.pendingVisits}`}>
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.error + '15' }]}>
              <MaterialCommunityIcons name="clock-alert" size={24} color={COLORS.error} />
            </View>
            <Text style={[styles.statValue, { fontFamily: 'manrope' }]} testID="pendingVisitsCount">
              {stats.pendingVisits}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: 'manrope' }]}>Pending</Text>
          </Surface>

          <Surface
            style={styles.statCard}
            accessibilityLabel={`Average rating: ${stats.avgRating.toFixed(1)} out of 5`}>
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.info + '15' }]}>
              <MaterialCommunityIcons name="star" size={24} color={COLORS.info} />
            </View>
            <Text style={[styles.statValue, { fontFamily: 'manrope' }]} testID="avgRating">
              {stats.avgRating.toFixed(1)}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: 'manrope' }]}>Avg Rating</Text>
          </Surface>

          <Surface
            style={styles.statCard}
            accessibilityLabel={`Recent sales (last 7 days): ${stats.recentSales}`}>
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.success + '15' }]}>
              <MaterialCommunityIcons name="currency-inr" size={24} color={COLORS.success} />
            </View>
            <Text style={[styles.statValue, { fontFamily: 'manrope' }]} testID="recentSalesCount">
              {stats.recentSales}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: 'manrope' }]}>Recent Sales</Text>
          </Surface>

          <Surface
            style={styles.statCard}
            accessibilityLabel={`Available plots: ${stats.availablePlots}`}>
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.warning + '15' }]}>
              <MaterialCommunityIcons name="home-search" size={24} color={COLORS.warning} />
            </View>
            <Text
              style={[styles.statValue, { fontFamily: 'manrope' }]}
              testID="availablePlotsCount2">
              {stats.availablePlots}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: 'manrope' }]}>Avail. Plots</Text>
          </Surface>
        </View>

        {/* Empty State - Adjusted slightly for minimalist view */}
        {stats.projects === 0 &&
          stats.plots === 0 &&
          stats.visitRequests === 0 &&
          !loading &&
          !error && (
            <Surface style={styles.emptyStateCard} accessibilityLabel="No data available message">
              <MaterialCommunityIcons name="chart-line" size={64} color={COLORS.textSecondary} />
              <Text
                style={[styles.emptyStateTitle, { fontFamily: 'manrope' }]}
                accessibilityRole="header">
                No Data Available
              </Text>
              <Text style={[styles.emptyStateSubtitle, { fontFamily: 'manrope' }]}>
                It looks like there is no data to display yet. Pull down to refresh or contact
                support if the issue persists.
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadData}
                accessibilityLabel="Retry loading data"
                accessibilityRole="button"
                testID="emptyStateRetryButton">
                <Text style={[styles.retryButtonText, { fontFamily: 'manrope' }]}>
                  Retry Loading
                </Text>
              </TouchableOpacity>
            </Surface>
          )}

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SAFE_AREA_TOP + 20, // Add extra padding below status bar
    paddingBottom: 20,
    minHeight: screenHeight - SAFE_AREA_TOP, // Ensure scroll view takes up enough space
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  authErrorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 20,
    textAlign: 'center',
  },
  authErrorSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24, // Increased spacing
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '500',
    fontFamily:'manrope',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  profileButton: {
    padding: 8, // Make touch area larger
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.error + '10', // Light background for error
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    ...SHADOW_CONFIG,
  },
  errorText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '500',
  },
  retryText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    width: (screenWidth - CARD_SPACING * 3) / 2, // 2 cards per row with spacing
    marginBottom: CARD_SPACING,
    padding: 18, // Slightly reduced padding
    borderRadius: BORDER_RADIUS,
    backgroundColor: COLORS.cardBackground, // This ensures it's always white
    alignItems: 'center',
    ...SHADOW_CONFIG,
    borderWidth: 0.5, // Subtle border
    borderColor: COLORS.border,
  },
  // We no longer need primaryStatCard if all cards should be white,
  // unless you want a *different* subtle highlight for other cards later.
  // primaryStatCard: {
  //   backgroundColor: COLORS.primary + '08',
  //   borderColor: COLORS.primary + '30',
  // },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    // Background color is now set inline for each card's icon,
    // allowing specific colors (like primary for Project) while card is white.
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 26, // Slightly larger value
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18, // Ensure text wraps nicely
  },
  emptyStateCard: {
    marginHorizontal: CARD_SPACING,
    marginBottom: CARD_SPACING,
    padding: 30,
    borderRadius: BORDER_RADIUS,
    backgroundColor: COLORS.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW_CONFIG,
    minHeight: screenHeight * 0.35, // Adjust minimum height dynamically
    borderColor: COLORS.border,
    borderWidth: 0.5,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomPadding: {
    height: 40, // Ensure content doesn't get cut off at the bottom
  },
});
