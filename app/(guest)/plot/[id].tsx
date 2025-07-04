import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { getPlotById, PlotType } from '../../../lib/api';

const { width } = Dimensions.get('window');

export default function PlotDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [plot, setPlot] = useState<PlotType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('Plot ID is missing');
      setLoading(false);
      return;
    }
    fetchPlotDetails();
  }, [id]);

  useEffect(() => {
    if (plot?.imageUrls && plot.imageUrls.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % (plot?.imageUrls?.length || 1);
          flatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
          return nextIndex;
        });
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [plot]);

  const fetchPlotDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        throw new Error('Plot ID is required');
      }

      const plotId = Array.isArray(id) ? id[0] : id;
      const data = await getPlotById(plotId);

      if (!data) {
        throw new Error('Plot not found');
      }

      setPlot(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load plot details';
      setError(errorMessage);
      console.error('Error fetching plot details:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderImageItem = ({ item }: { item: string }) => (
    <View style={{ width }}>
      <Image source={{ uri: item }} style={{ width: '100%', height: 200, resizeMode: 'cover' }} />
    </View>
  );

  const renderPaginationDots = () => {
    if (!plot?.imageUrls || plot.imageUrls.length <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        {plot.imageUrls.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentImageIndex && styles.activePaginationDot,
            ]}
          />
        ))}
      </View>
    );
  };

  const onScrollEnd = (event: any) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentImageIndex(newIndex);
  };

  // Helper to format price
  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Crore`;
    }
    if (price >= 100000) {
      return `₹${(price / 100000).toFixed(2)} Lac`;
    }
    return `₹${price.toLocaleString('en-IN')}`;
  };

  // Helper to format area
  const formatArea = (area: number) => {
    if (area >= 1000000) {
      return `${(area / 1000000).toFixed(2)} km`;
    }
    return `${area} m`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading plot details...</Text>
      </View>
    );
  }

  if (error || !plot) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF6B35" />
          <Text style={styles.errorText}>{error || 'Plot not found'}</Text>
          <TouchableOpacity onPress={fetchPlotDetails} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={plot.imageUrls || []}
            renderItem={renderImageItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            keyExtractor={(item, index) => index.toString()}
          />
          {renderPaginationDots()}

          {/* Header Controls */}
          <View style={styles.headerControls}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => setLiked((prev) => !prev)}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={24}
                color={liked ? '#FF6B35' : '#1F2937'}
              />
            </TouchableOpacity>
          </View>

          {/* Status Badge */}
          {plot.status.toLowerCase() === 'available' && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>Available</Text>
            </View>
          )}
        </View>

        {/* Content Card */}
        <View style={styles.contentCard}>
          <View style={styles.innerContent}>
            {/* Price Badge */}
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>{formatPrice(plot.price)}</Text>
            </View>

            {/* Title and Location */}
            <Text style={styles.title}>{plot.title}</Text>

            <View style={styles.locationRow}>
              <Ionicons name="location" size={18} color="#FF6B35" />
              <Text style={styles.locationText}>{plot.location}</Text>
            </View>

            {/* Property Details Grid */}
            <View style={styles.detailsCard}>
              <Text style={styles.detailsTitle}>Property Details</Text>
              <View style={styles.detailsGrid}>
                {/* Plot Area */}
                <View style={styles.detailItem}>
                  <View style={styles.detailHeader}>
                    <Ionicons name="resize-outline" size={18} color="#FF6B35" />
                    <Text style={styles.detailLabel}>Plot Area</Text>
                  </View>
                  <Text style={styles.detailValue}>{plot.dimension}</Text>
                </View>
                {/* Facing */}
                <View style={styles.detailItem}>
                  <View style={styles.detailHeader}>
                    <Ionicons name="compass-outline" size={18} color="#FF6B35" />
                    <Text style={styles.detailLabel}>Facing</Text>
                  </View>
                  <Text style={styles.detailValue}>{plot.facing}</Text>
                </View>
                {/* Price */}
                <View style={styles.detailItem}>
                  <View style={styles.detailHeader}>
                    <Ionicons name="pricetag-outline" size={18} color="#FF6B35" />
                    <Text style={styles.detailLabel}>Price</Text>
                  </View>
                  <Text style={styles.detailValue}>{plot.priceLabel}</Text>
                </View>
                {/* Total Area */}
                <View style={styles.detailItem}>
                  <View style={styles.detailHeader}>
                    <Ionicons name="analytics-outline" size={18} color="#FF6B35" />
                    <Text style={styles.detailLabel}>Total Area</Text>
                  </View>
                  <Text style={styles.detailValue}>{formatArea(plot.totalArea)}</Text>
                </View>
              </View>
            </View>

            {/* About Property */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About Property</Text>
              <Text style={styles.sectionText}>
                This agriculture/farm plot is available for sale at {plot.location}. It is a
                licensed plot in a very good area, the plot is measuring {plot.dimension} and priced{' '}
                {plot.priceLabel}.
              </Text>
            </View>

            {/* Amenities */}
            {plot.amenities && plot.amenities.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Amenities</Text>
                <View style={styles.amenitiesRow}>
                  {plot.amenities.map((amenity, index) => (
                    <View key={index} style={styles.amenityTag}>
                      <Text style={styles.amenityText}>{amenity}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Map View */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.mapContainer}>
                {plot.mapEmbedUrl ? (
                  <WebView
                    source={{
                      html: `
                        <html>
                          <head>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                            <style>
                              body { margin: 0; padding: 0; }
                              iframe { width: 100%; height: 100%; border: none; }
                            </style>
                          </head>
                          <body>
                            <iframe
                              src="${plot.mapEmbedUrl}"
                              width="100%"
                              height="100%"
                              style="border:0;"
                              allowfullscreen=""
                              loading="lazy"
                              referrerpolicy="no-referrer-when-downgrade"
                            ></iframe>
                          </body>
                        </html>
                      `,
                    }}
                    style={{ flex: 1 }}
                    scrollEnabled={false}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    renderLoading={() => (
                      <View style={styles.webViewLoading}>
                        <ActivityIndicator size="small" color="#FF6B35" />
                      </View>
                    )}
                  />
                ) : (
                  <View style={styles.mapUnavailable}>
                    <Ionicons name="location-outline" size={48} color="#9CA3AF" />
                    <Text style={styles.mapUnavailableText}>Map not available</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      {plot.status.toLowerCase() === 'available' && (
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => router.push(`/(guest)/book-visit/${plot.id}`)}>
            <Text style={styles.bookButtonText}>Book visit</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: { marginTop: 16, color: '#4B5563', fontSize: 16, fontFamily: 'Manrope-Regular' },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 24,
  },
  errorCard: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Manrope-Medium',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#FF8800',
    borderRadius: 16,
    shadowColor: '#FF8800',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  retryButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Manrope-Bold' },
  carouselContainer: { position: 'relative' },
  headerControls: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 12,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statusBadge: {
    position: 'absolute',
    top: 48,
    right: 80,
    backgroundColor: 'rgba(34,197,94,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusBadgeText: { color: '#fff', fontFamily: 'Manrope-Bold' },
  contentCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 10,
  },
  innerContent: { padding: 24 },
  priceBadge: {
    backgroundColor: '#FF8800',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 16,
  },
  priceBadgeText: { color: '#fff', fontSize: 20, fontFamily: 'Manrope-Bold' },
  title: {
    fontSize: 28,
    fontWeight: 'medium',
    color: '#1F2937',
    marginBottom: 8,
   fontFamily: 'manrope'
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  locationText: { fontSize: 16, color: '#6B7280', marginLeft: 8,  fontFamily: 'manrope' },
  detailsCard: { backgroundColor: '#F9FAFB', borderRadius: 20, padding: 20, marginBottom: 24 },
  detailsTitle: {
    fontSize: 20,
    color: '#111827',
    marginBottom: 16,
    fontFamily: 'manrope'
  },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  detailItem: {
    width: '50%',
    padding: 8,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    fontWeight: '600',
    fontFamily: 'manrope'
  },
  detailValue: {
    fontSize: 18,
    color: '#1F2937',
    marginLeft: 30,
     fontFamily: 'manrope'
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    color: '#111827',
    marginBottom: 12,
    fontFamily: 'manrope'
  },
  sectionText: { color: '#4B5563', fontSize: 14, lineHeight: 24,  fontFamily: 'manrope',textAlign:'justify' },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap' },
  amenityTag: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
  },
  amenityText: { color: '#FB923C',  fontFamily: 'manrope' },
  mapContainer: {
    height: 192,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  webViewLoading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapUnavailable: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapUnavailableText: { color: '#6B7280', marginTop: 8, fontFamily: 'Manrope-Regular' },
  bottomButtonContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  bookButton: {
    backgroundColor: '#FF8800',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#FF8800',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  bookButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Manrope-Bold',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  activePaginationDot: { backgroundColor: '#fff' },
});
