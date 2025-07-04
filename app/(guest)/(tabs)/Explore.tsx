import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  StyleSheet,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllPlots, PlotType } from '../../../lib/api';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window'); // No need for height if not directly used

// --- Scaling Utilities ---
const guidelineBaseWidth = 375;
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const scaleFont = (size: number) => (width / guidelineBaseWidth) * size;

const CARD_WIDTH = width * 0.9;
const DEFAULT_IMAGE = 'https://placehold.co/600x400/e2e8f0/64748b?text=Plot+Image';

// --- Color Palette (Consistent with previous examples) ---
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

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [plots, setPlots] = useState<PlotType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Animations for skeleton loader
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // --- Fetch Plots Function (with useCallback for optimization) ---
  const fetchPlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllPlots();
      setPlots(data);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      setError('Failed to load plots. Please try again later.');
      console.error('Error fetching plots:', err);
    } finally {
      setLoading(false);
      setRefreshing(false); // Ensure refreshing is reset after fetch
    }
  }, []);

  // --- Pull-to-Refresh Handler ---
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPlots();
  }, [fetchPlots]);

  // --- Initial Data Fetch on Mount ---
  useEffect(() => {
    fetchPlots();
  }, [fetchPlots]);

  // --- Shimmer Animation for Skeleton Loader ---
  useEffect(() => {
    const startShimmer = () => {
      shimmerAnim.setValue(0);
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    };

    if (loading) {
      startShimmer();
    } else {
      shimmerAnim.stopAnimation();
    }
    // Cleanup function for animation
    return () => {
      shimmerAnim.stopAnimation();
      shimmerAnim.setValue(0); // Reset animation value
    };
  }, [loading, shimmerAnim]);

  // --- Filter Plots based on Search Query ---
  const filteredPlots = plots.filter(
    (plot) =>
      plot.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plot.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Navigation to Plot Detail Screen ---
  const navigateToPlot = (plotId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: '/(guest)/plot/[id]' as 'string',
      params: { id: plotId },
    });
  };

  // --- Price Formatting Utility (for Indian Rupees) ---
  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(price / 100000).toFixed(2)} Lac`;
  };

  // --- Skeleton Loader Component ---
  const SkeletonLoader = () => {
    const translateX = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-CARD_WIDTH, CARD_WIDTH],
    });

    const ShimmerOverlay = ({ style }: { style?: any }) => (
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            transform: [{ translateX }],
            backgroundColor: 'rgba(255,255,255,0.3)',
          },
          style,
        ]}
      />
    );

    return (
      <View style={styles.skeletonContainer}>
        <View style={styles.skeletonSearchBar}>
          <ShimmerOverlay style={{ borderRadius: scale(16) }} />
        </View>
        {[...Array(3)].map((_, index) => (
          <View key={`skeleton-${index}`} style={[styles.cardContainer, styles.skeletonCard]}>
            <View style={styles.skeletonImage}>
              <ShimmerOverlay />
            </View>
            <View style={styles.skeletonContent}>
              <View style={[styles.skeletonTextLine, { width: '80%' }]}>
                <ShimmerOverlay />
              </View>
              <View style={[styles.skeletonTextLine, { width: '60%', height: scale(14) }]}>
                <ShimmerOverlay />
              </View>
              <View style={styles.skeletonDetailsRow}>
                <View style={[styles.skeletonDetailItem, { width: '35%' }]}>
                  <ShimmerOverlay />
                </View>
                <View style={[styles.skeletonDetailItem, { width: '35%' }]}>
                  <ShimmerOverlay />
                </View>
              </View>
              <View style={styles.skeletonButton}>
                <ShimmerOverlay />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // --- Render Individual Plot Item (for FlatList) ---
  const renderPlotItem = ({ item }: { item: PlotType }) => (
    <TouchableOpacity
      onPress={() => navigateToPlot(item.id)}
      style={{ width: CARD_WIDTH, marginBottom: scale(20) }}
    >
      <View style={styles.cardContainer}>
        {/* Image Container with Gradient Overlay */}
        <View style={styles.cardImageContainer}>
          <Image
            source={{ uri: item.imageUrls?.[0] || DEFAULT_IMAGE }}
            style={styles.cardImage}
            resizeMode="cover"
            onError={(e) => {
              if (e.nativeEvent.error) {
                console.warn(`Failed to load image for plot ${item.title}: ${e.nativeEvent.error}`);
              }
            }}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.imageGradient}
          />

          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: item.status.toLowerCase() === 'available' ? colors.success : colors.error },
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {item.status.toLowerCase() === 'available' ? 'Available' : 'Sold Out'}
            </Text>
          </View>

          {/* Price Tag */}
          <View style={styles.priceTag}>
            <Text style={styles.priceTagMainText}>{formatPrice(item.price)}</Text>
            <Text style={styles.priceTagSubText}>Onwards</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          {/* Title and Location */}
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={styles.cardLocation}>
            <Ionicons name="location-outline" size={scale(16)} color={colors.accent} />
            <Text style={styles.cardLocationText}>{item.location}</Text>
          </View>

          {/* Details Grid */}
          <View style={styles.cardDetailsGrid}>
            <View style={styles.cardDetailItem}>
              <Ionicons name="resize-outline" size={scale(16)} color={colors.accent} />
              <Text style={styles.cardDetailText}>{item.dimension}</Text>
            </View>

            <View style={styles.cardDetailItem}>
              <Ionicons name="compass-outline" size={scale(16)} color={colors.accent} />
              <Text style={styles.cardDetailText}>
                {item.facing}
              </Text>
            </View>
          </View>

          {/* Amenities */}
          {item.amenities && item.amenities.length > 0 && (
            <View style={styles.cardAmenitiesContainer}>
              {item.amenities.slice(0, 3).map((amenity, index) => (
                <View key={index} style={styles.amenityTag}>
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
              {item.amenities.length > 3 && (
                <View style={styles.amenityTag}>
                  <Text style={styles.amenityText}>+{item.amenities.length - 3} more</Text>
                </View>
              )}
            </View>
          )}

          {/* View Details Button */}
          <TouchableOpacity
            onPress={() => navigateToPlot(item.id)}
            style={styles.viewDetailsButton}
          >
            <Text style={styles.viewDetailsButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  // --- Conditional Rendering for Loading, Error, Empty States ---
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <SkeletonLoader />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.flexCenter} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <Ionicons name="alert-circle-outline" size={scale(64)} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchPlots} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      {/* Search Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={scale(20)} color={colors.text.tertiary} />
          <TextInput
            placeholder="Search by plot name or location"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.text.tertiary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
              <Ionicons name="close-circle" size={scale(20)} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredPlots}
        renderItem={renderPlotItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            <Ionicons name="search" size={scale(64)} color={colors.accentLight} />
            <Text style={styles.emptyStateTitle}>No plots found</Text>
            <Text style={styles.emptyStateText}>
              Try searching with different keywords or pull to refresh.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// --- StyleSheet for consistent and organized styling ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
  },
  flexCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: scale(20),
  },
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: scale(24),
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: scale(8) },
    shadowOpacity: 0.1,
    shadowRadius: scale(16),
    elevation: 8,
  },
  searchBarWrapper: {
    backgroundColor: colors.surface,
    paddingHorizontal: scale(16),
    paddingBottom: scale(16),
    paddingTop: Platform.OS === 'android' ? scale(16) : 0, // Ensure padding top for Android
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.05,
    shadowRadius: scale(8),
    elevation: 4,
    borderBottomLeftRadius: scale(20),
    borderBottomRightRadius: scale(20),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: scale(50),
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderColor: colors.border.light,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: scale(12),
    fontSize: scaleFont(16),
    color: colors.text.primary,
    fontFamily: 'manrope', // Example of custom font
  },
  clearSearchButton: {
    padding: scale(4),
  },
  flatListContent: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(16),
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
    color: colors.text.secondary,
    fontWeight: '500',
    fontSize: scaleFont(18),
    marginTop: scale(15),
    fontFamily: 'manrope',
  },
  retryButton: {
    backgroundColor: colors.accent,
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scale(20),
    paddingHorizontal: scale(25),
    paddingVertical: scale(12),
  },
  retryButtonText: {
    color: colors.text.inverse,
    fontWeight: '600',
    fontSize: scaleFont(16),
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scale(50),
    paddingHorizontal: scale(20),
  },
  emptyStateTitle: {
    color: colors.text.primary,
    fontWeight: 'bold',
    marginTop: scale(15),
    fontSize: scaleFont(20),
  },
  emptyStateText: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: scale(8),
    lineHeight: scale(22),
    fontSize: scaleFont(14),
  },
  // --- Card specific styles ---
  cardImageContainer: {
    position: 'relative',
    height: scale(190), // Adjusted height for image
    borderTopLeftRadius: scale(24), // Apply rounded corners here
    borderTopRightRadius: scale(24),
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: scale(80), // Increased gradient height
  },
  statusBadge: {
    position: 'absolute',
    right: scale(16),
    top: scale(16),
    borderRadius: scale(20), // More rounded badge
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
  },
  statusBadgeText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    textTransform: 'uppercase',
    color: colors.text.inverse,
  },
  priceTag: {
    position: 'absolute',
    bottom: scale(16),
    left: scale(16),
    borderRadius: scale(12), // More rounded price tag
    backgroundColor: colors.surface + 'E6', // Semi-transparent white
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    flexDirection: 'column', // Stack price and "Onwards"
    alignItems: 'flex-start',
  },
  priceTagMainText: {
    fontSize: scaleFont(20), // Larger font for main price
    fontWeight: 'bold',
    color: colors.accent,
    fontFamily: 'manrope'
  },
  priceTagSubText: {
    fontSize: scaleFont(11),
    color: colors.text.secondary,
    marginTop: scale(-2),
    fontFamily: 'manrope' // Adjust spacing
  },
  cardContent: {
    padding: scale(20),
  },
  cardTitle: {
    fontSize: scaleFont(22), // Larger title
    fontWeight: 'medium',
    color: colors.text.primary,
    marginBottom: scale(6),
    lineHeight: scaleFont(28),
    fontFamily: 'manrope',// Ensure readability
  },
  cardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(16), // More space before details
  },
  cardLocationText: {
    marginLeft: scale(6),
    fontSize: scaleFont(15),
    color: colors.text.secondary,
    fontFamily: 'manrope',
  },
  cardDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10), // Gap for both row and column
    marginBottom: scale(16),
  },
  cardDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scale(10), // More rounded detail items
    backgroundColor: colors.accent + '10',
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
  },
  cardDetailText: {
    marginLeft: scale(8),
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: colors.text.primary,
    textTransform: 'capitalize',
     fontFamily: 'manrope'
  },
  cardAmenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: scale(16), // Space before button
  },
  amenityTag: {
    borderRadius: scale(16),
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderWidth: 1, // Added border for clarity
    borderColor: colors.border.light,
  },
  amenityText: {
    fontSize: scaleFont(12),
    color: colors.text.secondary,
    fontFamily: 'manrope'
  },
  viewDetailsButton: {
    marginTop: scale(10),
    borderRadius: scale(16), // More rounded button
    backgroundColor: colors.accent,
    paddingVertical: scale(16), // Taller button
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.2,
    shadowRadius: scale(8),
    elevation: 4,
  },
  viewDetailsButtonText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: colors.text.inverse,
    fontSize: scaleFont(17),
   fontFamily: 'manrope'
  },
  // --- Skeleton Loader Styles ---
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: scale(16),
    paddingTop: scale(16),
    alignItems: 'center',
  },
  skeletonSearchBar: {
    width: CARD_WIDTH,
    height: scale(50),
    backgroundColor: colors.surfaceElevated,
    borderRadius: scale(16),
    marginBottom: scale(20),
    overflow: 'hidden',
  },
  skeletonCard: {
    marginBottom: scale(20),
    width: CARD_WIDTH,
  },
  skeletonImage: {
    height: scale(190),
    backgroundColor: colors.border.light,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    overflow: 'hidden',
    position: 'relative',
  },
  skeletonContent: {
    padding: scale(20),
  },
  skeletonTextLine: {
    height: scale(20),
    backgroundColor: colors.border.medium,
    borderRadius: scale(4),
    marginBottom: scale(8),
    overflow: 'hidden',
    position: 'relative',
  },
  skeletonDetailsRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: scale(16),
    marginBottom: scale(16),
  },
  skeletonDetailItem: {
    height: scale(38),
    backgroundColor: colors.border.medium,
    borderRadius: scale(10),
    overflow: 'hidden',
    position: 'relative',
  },
  skeletonButton: {
    height: scale(50),
    backgroundColor: colors.border.medium,
    borderRadius: scale(16),
    marginTop: scale(10),
    overflow: 'hidden',
    position: 'relative',
  },
});
