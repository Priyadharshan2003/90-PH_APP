import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Configuration Constants ---
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://90-dph.vercel.app';
const ACCEPTABLE_GPS_ACCURACY_THRESHOLD = 1500; // Meters

// --- Color Palette - White Theme ---
const colors = {
  primary: '#2563eb', // Blue primary - This will now be overridden for the buttons
  secondary: '#3b82f6', // Lighter blue
  background: '#ffffff', // Pure white background
  card: '#f8fafc', // Very light gray for cards
  text: '#1e293b', // Dark gray for main text
  subtext: '#64748b', // Medium gray for subtext
  error: '#ef4444', // Red for errors
  warning: '#f59e0b', // Amber for warnings
  success: '#10b981', // Green for success
  border: '#e2e8f0', // Light gray for borders
  lightBackground: '#f1f5f9', // Very light blue-gray
  accent: '#E67E22', // Changed to a darker orange for the buttons
  surface: '#ffffff', // Pure white surface
  muted: '#f8fafc', // Muted background
};

// --- Interfaces ---
interface OfficeData {
  id: string;
  officeName: string;
  latitude: number;
  longitude: number;
  requiredDistance?: number;
}

interface LocationData {
  lat: number;
  lng: number;
  accuracy: number | null;
}

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface PulsingDotProps {
  size?: number;
  color?: string;
}

// --- Reusable Components ---

const Card: React.FC<CardProps> = ({ children, style = {} }) => (
  <View style={[styles.card, style]}>
    {children}
  </View>
);

const PulsingDot: React.FC<PulsingDotProps> = ({ size = 8, color = colors.success }) => {
  const pulse = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
        ]),
      ])
    );
    pulseAnim.start();
    return () => pulseAnim.stop();
  }, [pulse, opacity]);

  return (
    <View style={styles.pulsingDotContainer}>
      <Animated.View
        style={[
          styles.pulsingDotOuter,
          {
            width: size * 2,
            height: size * 2,
            borderRadius: size,
            backgroundColor: color,
            opacity: opacity,
            transform: [{ scale: pulse }],
          },
        ]}
      />
      <View
        style={[
          styles.pulsingDotInner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
};

// --- Main Screen Component ---

export default function MarkAttendanceScreen() {
  const { user, isLoaded } = useUser();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [assignedOffices, setAssignedOffices] = useState<OfficeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<string>('');
  const [lastTap, setLastTap] = useState<number>(0);

  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371e3; // metres
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    },
    []
  );

  const getDistanceToNearestOffice = useCallback((): {
    distance: number;
    office: OfficeData | null;
  } => {
    if (!location || assignedOffices.length === 0) {
      return { distance: Infinity, office: null };
    }

    let minDistance = Infinity;
    let nearestOffice = null;

    for (const office of assignedOffices) {
      const distance = calculateDistance(
        location.lat,
        location.lng,
        office.latitude,
        office.longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestOffice = office;
      }
    }

    return { distance: minDistance, office: nearestOffice };
  }, [location, assignedOffices, calculateDistance]);

  const getLocation = useCallback(async () => {
    setError(null);
    try {
      let { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      setLocationPermissionStatus(existingStatus);

      if (existingStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        existingStatus = status;
        setLocationPermissionStatus(status);

        if (status !== 'granted') {
          Alert.alert(
            'Location Permission Required',
            'Please enable location access to mark attendance.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Settings',
                onPress: () => Linking.openSettings(),
              },
            ]
          );
          setError('Location permission denied.');
          setLocation(null);
          return;
        }
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      if (loc.coords.accuracy && loc.coords.accuracy > ACCEPTABLE_GPS_ACCURACY_THRESHOLD) {
        setError(
          `Low GPS accuracy (${loc.coords.accuracy.toFixed(0)}m). Please move to an open area.`
        );
        setLocation(null);
        return;
      }

      setLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
      });
    } catch (err) {
      console.error('Error getting location:', err);
      setError('Unable to get location. Please check your GPS settings.');
      setLocation(null);
    }
  }, []);

  const fetchAssignedOffices = useCallback(async () => {
    if (!user?.id) {
      setError('Authentication required.');
      return;
    }

    try {
      const url = `${API_URL}/api/managers/assigned-offices?clerkId=${encodeURIComponent(user.id)}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error('Invalid response format from server.');
      }

      if (!res.ok) {
        let errorMessage = data.error || data.message || `HTTP error! Status: ${res.status}`;
        if (res.status === 404) {
          errorMessage = 'No offices assigned to your account.';
        } else if (res.status === 401) {
          errorMessage = 'Authentication failed. Please sign in again.';
        } else if (res.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        throw new Error(errorMessage);
      }

      if (!Array.isArray(data)) {
        throw new Error('Invalid office data format.');
      }

      if (data.length === 0) {
        setError('No offices assigned to your account.');
        setAssignedOffices([]);
        return;
      }

      setAssignedOffices(data);
    } catch (err) {
      console.error('Error fetching assigned offices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch office details.');
      setAssignedOffices([]);
    }
  }, [user]);

  const initializeData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchAssignedOffices(), getLocation()]);
    } catch (err) {
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [fetchAssignedOffices, getLocation]);

  useEffect(() => {
    if (isLoaded && user) {
      initializeData();
    }
  }, [isLoaded, user, initializeData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initializeData();
    setRefreshing(false);
  }, [initializeData]);

  const proceedWithAttendance = useCallback(
    async (attendanceType = 'REGULAR') => {
      if (!user || !location || !assignedOffices.length) {
        Alert.alert('Error', 'Unable to mark attendance. Please try again.');
        return;
      }

      setMarking(true);
      Vibration.vibrate(50);

      const { distance, office: nearestOffice } = getDistanceToNearestOffice();

      const requestBody = {
        clerkId: user.id,
        latitude: location.lat,
        longitude: location.lng,
        accuracy: location.accuracy,
        timestamp: new Date().toISOString(),
        deviceInfo: {
          platform: Platform.OS,
          timestamp: new Date().toISOString(),
        },
        attendanceType,
      };

      try {
        const res = await fetch(`${API_URL}/api/attendance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const responseText = await res.text();
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          throw new Error('Invalid server response.');
        }

        if (res.ok) {
          Alert.alert(
            'Success ✓',
            `Attendance marked successfully!\n\nOffice: ${
              responseData.attendance?.officeName || nearestOffice?.officeName || 'N/A'
            }\nDistance: ${Math.round(distance)}m`,
            [{ text: 'OK' }]
          );
          Vibration.vibrate([50, 100, 50]);
        } else {
          let alertMessage = responseData.error || responseData.message || 'Failed to mark attendance.';
          if (responseData.nearestOffice && responseData.distance) {
            alertMessage += `\n\nNearest office: ${responseData.nearestOffice}\nDistance: ${responseData.distance}m`;
          }
          Alert.alert('Failed', alertMessage);
        }
      } catch (err) {
        Alert.alert('Network Error', 'Please check your connection and try again.');
      } finally {
        setMarking(false);
      }
    },
    [user, location, assignedOffices, getDistanceToNearestOffice]
  );

  const markAttendance = useCallback(async () => {
    const now = Date.now();
    if (now - lastTap < 1500) {
      return;
    }
    setLastTap(now);

    if (!user) {
      Alert.alert('Error', 'Please sign in to continue.');
      return;
    }

    if (!location) {
      Alert.alert('Location Required', 'Please enable location services and try again.');
      return;
    }

    if (assignedOffices.length === 0) {
      Alert.alert('No Offices', 'No offices assigned to your account.');
      return;
    }

    if (location.accuracy && location.accuracy > ACCEPTABLE_GPS_ACCURACY_THRESHOLD) {
      Alert.alert(
        'Low GPS Accuracy',
        `Current accuracy: ${location.accuracy.toFixed(0)}m. Move to an open area for better signal.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => proceedWithAttendance() },
        ]
      );
      return;
    }

    const { distance, office: nearestOffice } = getDistanceToNearestOffice();
    const requiredGeofenceDistance = nearestOffice?.requiredDistance || 1000;

    if (!nearestOffice) {
      Alert.alert('Error', 'Unable to find nearest office.');
      return;
    }

    if (distance > requiredGeofenceDistance) {
      Alert.alert(
        'Out of Range',
        `Distance to ${nearestOffice.officeName}: ${
          distance >= 1000 ? (distance / 1000).toFixed(1) + ' km' : Math.round(distance) + ' m'
        }\nRequired: Within ${requiredGeofenceDistance}m`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Mark Anyway', onPress: () => proceedWithAttendance() },
        ]
      );
      return;
    }

    await proceedWithAttendance();
  }, [user, location, assignedOffices, lastTap, getDistanceToNearestOffice, proceedWithAttendance]);

  const markOnDutyAttendance = useCallback(async () => {
    await proceedWithAttendance('ON_DUTY');
  }, [proceedWithAttendance]);

  // Loading state
  if (!isLoaded || loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <LottieView
          source={require('../../../assets/loading-animation.json')}
          autoPlay
          loop
          style={styles.loadingAnimation}
        />
        <Text style={styles.loadingText}>Loading workspace...</Text>
      </SafeAreaView>
    );
  }

  // Authentication required
  if (!user) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.authContainer}>
          <Ionicons name="person-circle-outline" size={64} color={colors.primary} />
          <Text style={styles.authTitle}>Sign In Required</Text>
          <Text style={styles.authSubtitle}>Please authenticate to continue</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main content
  const { distance, office: nearestOffice } = getDistanceToNearestOffice();
  const requiredGeofenceDistance = nearestOffice?.requiredDistance || 1000;
  const isWithinRange = distance <= requiredGeofenceDistance;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.nameText}>{user.firstName || 'User'}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.statusContainer}>
              <PulsingDot size={6} color={colors.success} />
              <Text style={styles.statusText}>Online</Text>
            </View>
            <Text style={styles.dateText}>{new Date().toLocaleDateString()}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}>
        
        {/* Location Status */}
        <Card style={styles.locationCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: location ? colors.success : colors.error }]}>
              <Ionicons
                name={location ? 'location' : 'location-outline'}
                size={20}
                color={colors.surface}
              />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Location Status</Text>
              <Text style={[styles.cardSubtitle, { color: location ? colors.success : colors.error }]}>
                {location ? 'Ready' : 'Required'}
              </Text>
            </View>
          </View>
          
          {location ? (
            <View style={styles.locationDetails}>
              <View style={styles.coordinatesContainer}>
                <Text style={styles.coordinatesLabel}>Current Position</Text>
                <Text style={styles.coordinatesText}>
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </Text>
                <Text style={styles.accuracyText}>
                  Accuracy: {location.accuracy?.toFixed(0) || 'N/A'}m
                </Text>
              </View>
              <TouchableOpacity onPress={getLocation} style={styles.refreshButton}>
                <Ionicons name="refresh" size={16} color={colors.primary} />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.locationError}>
              <Text style={styles.errorText}>Location access needed</Text>
              <TouchableOpacity onPress={getLocation} style={styles.enableButton}>
                <Text style={styles.enableButtonText}>Enable Location</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* Attendance Status */}
        {location && assignedOffices.length > 0 && (
          <Card style={[styles.attendanceCard, { 
            backgroundColor: isWithinRange ? colors.lightBackground : '#fef2f2',
            borderColor: isWithinRange ? colors.success : colors.error,
            borderWidth: 1
          }]}>
            <View style={styles.attendanceHeader}>
              <View style={[styles.attendanceIcon, { 
                backgroundColor: isWithinRange ? colors.success : colors.error 
              }]}>
                <Ionicons
                  name={isWithinRange ? 'checkmark-circle' : 'alert-circle'}
                  size={24}
                  color={colors.surface}
                />
              </View>
              <Text style={styles.attendanceTitle}>
                {isWithinRange ? 'Ready to Clock In' : 'Move Closer to Office'}
              </Text>
            </View>
            
            <View style={styles.attendanceDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Office</Text>
                <Text style={styles.detailValue}>{nearestOffice?.officeName || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Distance</Text>
                <Text style={styles.detailValue}>
                  {distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={[styles.detailValue, { 
                  color: isWithinRange ? colors.success : colors.error 
                }]}>
                  {isWithinRange ? 'In Range' : 'Out of Range'}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={markAttendance}
            disabled={marking || !location || assignedOffices.length === 0}
            style={[styles.primaryButton, {
              backgroundColor: marking || !location || assignedOffices.length === 0 
                ? colors.border : colors.accent 
            }]}>
            {marking ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <>
                <Ionicons name="time" size={20} color={colors.surface} />
                <Text style={styles.primaryButtonText}>Mark Attendance</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={markOnDutyAttendance}
            disabled={marking || !location || assignedOffices.length === 0}
            style={[styles.secondaryButton, {
              backgroundColor: marking || !location || assignedOffices.length === 0 
                ? colors.border : colors.accent 
            }]}>
            {marking ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <>
                <Ionicons name="briefcase" size={20} color={colors.surface} />
                <Text style={styles.secondaryButtonText}>Mark On Duty</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  loadingAnimation: {
    width: 120,
    height: 120,
  },
  loadingText: {
    marginTop: 16,
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  authContainer: {
    alignItems: 'center',
    padding: 20,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: colors.primary, // This button remains primary blue
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    backgroundColor: colors.surface,
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
    fontFamily:'manrope'
  },
  nameText: {
    fontSize: 16,
    color: colors.subtext,
    fontWeight: '500',
    fontFamily:'manrope'
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: colors.success,
    marginLeft: 6,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: colors.subtext,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  locationCard: {
    // Additional styles for location card
  },
  locationDetails: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coordinatesContainer: {
    marginBottom: 12,
  },
  coordinatesLabel: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: 4,
    fontWeight: '500',
  },
  coordinatesText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 2,
  },
  accuracyText: {
    fontSize: 11,
    color: colors.subtext,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.lightBackground,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  refreshButtonText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  locationError: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginBottom: 8,
  },
  enableButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  enableButtonText: {
    fontSize: 12,
    color: colors.surface,
    fontWeight: '500',
  },
  attendanceCard: {
    // Additional styles for attendance card
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  attendanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
  },
  attendanceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginLeft: 12, // Adjusted for consistency
  },
  attendanceDetails: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 20,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20, // Increased borderRadius for more rounded corners
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20, // Increased borderRadius for more rounded corners
  },
  secondaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  pulsingDotContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulsingDotOuter: {
    position: 'absolute',
  },
  pulsingDotInner: {
    position: 'absolute',
  },
});
